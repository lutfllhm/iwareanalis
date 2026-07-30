import axios from 'axios';
import crypto from 'crypto';
import prisma from './db';
import { encrypt, decrypt } from './cryptoService';
import { config } from '../config';
import logger from './logger';
import { SyncStatus } from '@prisma/client';

// Accurate Online API mengembalikan tanggal sebagai string "DD/MM/YYYY", kadang
// dengan jam menyertai (mis. createDate = "DD/MM/YYYY HH:mm:ss"). `new Date(str)`
// men-treat string bergaya slash sebagai MM/DD/YYYY (US), sehingga hari & bulan
// tertukar. Parse manual berdasar format Accurate.
export function parseAccurateDate(value: string | undefined | null): Date {
  if (!value) return new Date(NaN);
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/.exec(value.trim());
  if (!match) return new Date(value);
  const [, day, month, year, hour, minute, second] = match;
  return new Date(
    Number(year), Number(month) - 1, Number(day),
    hour ? Number(hour) : 0, minute ? Number(minute) : 0, second ? Number(second) : 0
  );
}

function formatAccurateDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Berapa lama ke belakang histori transaksi ditarik saat sync manual/awal (2 tahun),
// supaya tidak hanya mengandalkan batch/halaman default yang dikembalikan Accurate.
const SYNC_HISTORY_YEARS = 2;

// Sync terjadwal (cron) berjalan berulang dengan interval singkat, jadi cukup
// menarik beberapa hari terakhir (invoice baru atau yang baru saja diedit di
// Accurate) alih-alih menarik ulang 2 tahun penuh setiap siklus.
const SCHEDULED_SYNC_LOOKBACK_DAYS = 7;

function getSyncDateRange(fullHistory: boolean): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (fullHistory) {
    start.setFullYear(start.getFullYear() - SYNC_HISTORY_YEARS);
  } else {
    start.setDate(start.getDate() - SCHEDULED_SYNC_LOOKBACK_DAYS);
  }
  return { startDate: formatAccurateDate(start), endDate: formatAccurateDate(end) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Accurate Online menerapkan rate limit dan membalas HTTP 429 saat dilewati.
// Panggilan detail per baris (detail.do, employee/detail.do, item/list.do)
// dilakukan sequentially dengan jeda kecil (throttleAccurateCall) dan retry
// dengan backoff di sini supaya sync besar tidak gagal total saat kena 429.
const ACCURATE_CALL_DELAY_MS = 250;
const ACCURATE_MAX_RETRIES = 4;

async function axiosGetWithRetry<T = any>(url: string, options: Record<string, any>): Promise<{ data: T }> {
  let attempt = 0;
  while (true) {
    try {
      return await axios.get(url, options);
    } catch (err: any) {
      const status = err.response?.status;
      attempt++;
      if (status !== 429 || attempt > ACCURATE_MAX_RETRIES) {
        throw err;
      }
      const backoffMs = ACCURATE_CALL_DELAY_MS * 2 ** attempt;
      logger.warn(`Accurate rate limit (429) on ${url}, retry ${attempt}/${ACCURATE_MAX_RETRIES} after ${backoffMs}ms`);
      await sleep(backoffMs);
    }
  }
}

// Jalankan `fn` sequentially untuk tiap item dengan jeda tetap di antaranya,
// untuk menghindari membanjiri Accurate API dengan request paralel/cepat.
async function throttledMap<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (const item of items) {
    results.push(await fn(item));
    await sleep(ACCURATE_CALL_DELAY_MS);
  }
  return results;
}

/**
 * Tarik semua halaman dari endpoint Accurate `list.do` yang mendukung
 * paginasi (`sp.pageCount`), memanggil `onPage` untuk tiap baris yang didapat.
 * Tanpa ini, sync hanya membaca halaman pertama (default ~100-200 baris
 * terbaru) dan diam-diam kehilangan seluruh histori yang lebih lama.
 */
async function fetchAllAccuratePages(
  url: string,
  headers: Record<string, string>,
  baseParams: Record<string, string>,
  onPage: (rows: any[]) => Promise<void>
): Promise<number> {
  let page = 1;
  let totalRows = 0;

  while (true) {
    const response = await (async () => {
      let attempt = 0;
      while (true) {
        try {
          return await axios.post(
            url,
            new URLSearchParams({ ...baseParams, page: String(page), pageSize: '100' }).toString(),
            {
              headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
              maxRedirects: 5,
            }
          );
        } catch (err: any) {
          attempt++;
          if (err.response?.status !== 429 || attempt > ACCURATE_MAX_RETRIES) throw err;
          const backoffMs = ACCURATE_CALL_DELAY_MS * 2 ** attempt;
          logger.warn(`Accurate rate limit (429) on ${url} page=${page}, retry ${attempt}/${ACCURATE_MAX_RETRIES} after ${backoffMs}ms`);
          await sleep(backoffMs);
        }
      }
    })();

    if (!response.data || !response.data.d) {
      throw new Error(response.data?.message || 'No data returned from Accurate');
    }

    const rows: any[] = response.data.d;
    await onPage(rows);
    totalRows += rows.length;

    const pageCount = response.data.sp?.pageCount || 1;
    if (page >= pageCount || rows.length === 0) break;
    page++;
    await sleep(ACCURATE_CALL_DELAY_MS);
  }

  return totalRows;
}

export class AccurateService {

  /**
   * Helper to retrieve configurations/secrets securely from the DB settings table
   */
  static async getSetting(key: string): Promise<string> {
    try {
      const setting = await prisma.setting.findUnique({ where: { key } });
      if (!setting || !setting.value) return '';

      // Decrypt if it's a sensitive key
      if (key.includes('TOKEN') || key.includes('SECRET')) {
        return decrypt(setting.value);
      }
      return setting.value;
    } catch (error) {
      logger.error(`Failed to get setting for key ${key}:`, error);
      return '';
    }
  }

  /**
   * Helper to save configurations/secrets securely to the DB settings table
   */
  static async saveSetting(key: string, value: string): Promise<void> {
    try {
      // Encrypt if it's a sensitive key
      const finalValue = (key.includes('TOKEN') || key.includes('SECRET')) && value
        ? encrypt(value)
        : value;

      await prisma.setting.upsert({
        where: { key },
        update: { value: finalValue },
        create: { key, value: finalValue },
      });
    } catch (error) {
      logger.error(`Failed to save setting for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Build the HTTP headers required for an Accurate Online API Token request:
   * Authorization (Bearer API Token), X-Api-Timestamp and X-Api-Signature
   * (HMAC-SHA256 of the timestamp, keyed with the Signature Secret, Base64-encoded).
   */
  static async getApiTokenHeaders(): Promise<Record<string, string>> {
    const apiToken = await this.getSetting('ACCURATE_API_TOKEN');
    const signatureSecret = await this.getSetting('ACCURATE_SIGNATURE_SECRET');

    if (!apiToken || !signatureSecret) {
      throw new Error('API Token belum dikonfigurasi. Silakan hubungkan akun Accurate terlebih dahulu di halaman Pengaturan.');
    }

    // Accurate Online mengharapkan waktu lokal WIB (Asia/Jakarta), terlepas dari timezone OS server.
    const timestamp = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).replace(',', '');

    const signature = crypto
      .createHmac('sha256', signatureSecret)
      .update(timestamp)
      .digest('base64');

    return {
      'Authorization': `Bearer ${apiToken}`,
      'X-Api-Timestamp': timestamp,
      'X-Api-Signature': signature,
    };
  }

  /**
   * Verify the App Key + API Token by calling /api/api-token.do, which also
   * reveals the dynamic host (e.g. https://zeus.accurate.id) to use for
   * subsequent API calls against the user's data usaha.
   */
  static async verifyApiToken(): Promise<{ host: string; dbAlias: string; dbId: number }> {
    if (config.accurate.mock) {
      logger.info('Verify API Token (MOCK MODE)');
      const sessionInfo = { host: 'https://api.accurate.id', dbAlias: 'PT AOL User (MOCK)', dbId: 12345 };
      await this.saveSetting('ACCURATE_SESSION_HOST', sessionInfo.host);
      await this.saveSetting('ACCURATE_DB_ID', String(sessionInfo.dbId));
      await this.saveSetting('ACCURATE_DB_NAME', sessionInfo.dbAlias);
      return sessionInfo;
    }

    const headers = await this.getApiTokenHeaders();

    try {
      const response = await axios.post(
        'https://account.accurate.id/api/api-token.do',
        null,
        { headers, maxRedirects: 5 }
      );

      logger.info(`Accurate /api/api-token.do raw response: ${JSON.stringify(response.data)}`);

      if (!response.data || !response.data.s) {
        const detail = response.data?.d || response.data?.message;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'API Token tidak valid');
      }

      const dataUsaha = response.data.d?.database || response.data.d?.['data usaha'] || response.data.d?.dataUsaha;
      const host = dataUsaha?.host;
      const dbId = dataUsaha?.id;
      const dbAlias = dataUsaha?.alias || dataUsaha?.name || dataUsaha?.databaseAlias;

      if (!host) {
        throw new Error(`Response Accurate tidak menyertakan host Data Usaha: ${JSON.stringify(response.data.d)}`);
      }

      await this.saveSetting('ACCURATE_SESSION_HOST', host);
      if (dbId) await this.saveSetting('ACCURATE_DB_ID', String(dbId));
      if (dbAlias) await this.saveSetting('ACCURATE_DB_NAME', dbAlias);

      logger.info(`Accurate API Token verified: host=${host}, db=${dbAlias}`);
      return { host, dbAlias, dbId };
    } catch (error: any) {
      const status = error.response?.status;
      const accurateError = error.response?.data;
      const detail = accurateError?.d || accurateError?.message || error.message;
      const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
      logger.error(`Failed to verify API Token (status=${status}):`, accurateError || error.message);

      if (status === 401 || status === 403) {
        throw new Error(
          `App Key, Signature Secret, atau API Token tidak valid/sudah dihapus di Accurate (HTTP ${status}). ` +
          `Detail: ${detailStr}. Silakan buat ulang API Token baru dari menu Accurate Store - API Token.`
        );
      }

      throw new Error(detailStr || error.message || 'Gagal memverifikasi API Token');
    }
  }

  /**
   * Re-check the currently stored credentials against Accurate without
   * requiring the caller to resupply App Key / Signature Secret / API Token.
   * Used by the "Test Koneksi" button in Settings.
   */
  static async testConnection(): Promise<{ host: string; dbAlias: string; dbId: number }> {
    const apiToken = await this.getSetting('ACCURATE_API_TOKEN');
    const signatureSecret = await this.getSetting('ACCURATE_SIGNATURE_SECRET');

    if (!apiToken || !signatureSecret) {
      throw new Error('Belum ada kredensial Accurate tersimpan. Silakan hubungkan akun Accurate terlebih dahulu di halaman Pengaturan.');
    }

    return this.verifyApiToken();
  }

  /**
   * Synchronize modules from Accurate Online to MySQL
   */
  static async syncModule(moduleName: string, fullHistory: boolean = false): Promise<{ success: boolean; count: number; error?: string }> {
    const startTime = Date.now();
    logger.info(`Starting synchronization for module: ${moduleName}`);

    try {
      let syncCount = 0;

      if (config.accurate.mock) {
        // MOCK SYNC ENGINE
        await new Promise((resolve) => setTimeout(resolve, 600)); // simulate network delay
        
        if (moduleName === 'Barang & Jasa') {
          syncCount = 8;
        } else if (moduleName === 'Pelanggan') {
          syncCount = 5;
        } else if (moduleName === 'Faktur Penjualan') {
          // This will re-seed/add random invoice data
          syncCount = 10;
        } else if (moduleName === 'Retur Penjualan') {
          syncCount = 2;
        } else if (moduleName === 'Rincian Penjualan Barang') {
          syncCount = 15;
        } else if (moduleName === 'Transaksi Penjualan') {
          syncCount = 20;
        } else if (moduleName === 'Mutasi Serial Number') {
          syncCount = 12;
        } else if (moduleName === 'Ringkasan Mutasi Stok') {
          syncCount = 8;
        } else if (moduleName === 'Work Order') {
          syncCount = 4;
        } else {
          syncCount = Math.floor(Math.random() * 20) + 5;
        }

        // Record log in DB
        await prisma.syncLog.create({
          data: {
            modul: moduleName,
            status: SyncStatus.SUCCESS,
            jumlah_baris: syncCount,
            durasi_ms: Date.now() - startTime,
          },
        });

        logger.info(`Sync SUCCESS (MOCK MODE) for ${moduleName}. Rows synced: ${syncCount}`);
        return { success: true, count: syncCount };
      }

      // REAL ACCURATE INTEGRATION
      const host = await this.getSetting('ACCURATE_SESSION_HOST');
      if (!host) {
        throw new Error('Accurate authentication session is missing. Please connect and verify the API Token first.');
      }
      const headers = await this.getApiTokenHeaders();

      // Fetch data depending on the module
      if (moduleName === 'Barang & Jasa') {
        syncCount = await this.pullBarangJasa(host, headers);
      } else if (moduleName === 'Pelanggan') {
        syncCount = await this.pullPelanggan(host, headers);
      } else if (moduleName === 'Faktur Penjualan') {
        syncCount = await this.pullFakturPenjualan(host, headers, fullHistory);
      } else if (moduleName === 'Retur Penjualan') {
        syncCount = await this.pullReturPenjualan(host, headers, fullHistory);
      } else if (moduleName === 'Rincian Penjualan Barang') {
        syncCount = await this.pullRincianPenjualanBarang(host, headers, fullHistory);
      } else if (moduleName === 'Mutasi Serial Number') {
        syncCount = await this.pullMutasiSerialNumber(host, headers);
      } else if (moduleName === 'Ringkasan Mutasi Stok') {
        syncCount = await this.pullRingkasanMutasiStok(host, headers);
      } else if (moduleName === 'Work Order') {
        syncCount = await this.pullWorkOrder(host, headers);
      } else {
        throw new Error(`Unknown module: ${moduleName}`);
      }

      // Create Success Sync Log
      await prisma.syncLog.create({
        data: {
          modul: moduleName,
          status: SyncStatus.SUCCESS,
          jumlah_baris: syncCount,
          durasi_ms: Date.now() - startTime,
        },
      });

      return { success: true, count: syncCount };
    } catch (error: any) {
      const status = error.response?.status;
      const accurateDetail = error.response?.data?.d || error.response?.data?.message;
      let errorMessage = error.message || 'Unknown integration error';

      if (status === 401 || status === 403) {
        errorMessage = `Sesi Accurate telah berakhir atau token tidak valid (HTTP ${status}). ` +
          `${accurateDetail ? `Detail: ${accurateDetail}. ` : ''}Silakan hubungkan ulang di halaman Pengaturan.`;
      }

      logger.error(`Sync FAILED for ${moduleName} (status=${status}):`, error.response?.data || error);

      // Create Failed Sync Log
      await prisma.syncLog.create({
        data: {
          modul: moduleName,
          status: SyncStatus.FAILED,
          jumlah_baris: 0,
          pesan_error: errorMessage,
          durasi_ms: Date.now() - startTime,
        },
      });

      return { success: false, count: 0, error: errorMessage };
    }
  }

  // --- Real Puller Implementations ---

  private static async pullBarangJasa(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: POST /api/item/list.do
    let count = 0;

    await fetchAllAccuratePages(
      `${host}/accurate/api/item/list.do`,
      headers,
      {
        fields: 'no,name,itemType,itemCategory,itemGroup,upToDate,suspended,quantity,totalQuantity',
      },
      async (items) => {
        for (const item of items) {
          // Mapping field Accurate -> Database
          await prisma.barangJasa.upsert({
            where: { kode_barang: item.no },
            update: {
              nama_barang: item.name,
              kategori_barang: item.itemCategory?.name || 'Umum',
              nama_merek_barang: item.itemGroup?.name || null,
              non_aktif: item.suspended || false,
              kts_gdng_pengguna: item.quantity || 0,
              kts_semua_gdng: item.totalQuantity || 0,
              synced_at: new Date(),
            },
            create: {
              kode_barang: item.no,
              nama_barang: item.name,
              kategori_barang: item.itemCategory?.name || 'Umum',
              nama_merek_barang: item.itemGroup?.name || null,
              non_aktif: item.suspended || false,
              tgl_jam_pembuatan: new Date(),
              kts_gdng_pengguna: item.quantity || 0,
              kts_semua_gdng: item.totalQuantity || 0,
              synced_at: new Date(),
            },
          });
          count++;
        }
      }
    );

    return count;
  }

  private static async pullPelanggan(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: POST /api/customer/list.do
    let count = 0;

    await fetchAllAccuratePages(
      `${host}/accurate/api/customer/list.do`,
      headers,
      {
        fields: 'id,name,customerNo,customerGroup,suspended,shipZipCode,shipCity,shipProvince,shipStreet',
      },
      async (customers) => {
        for (const cust of customers) {
          await prisma.pelanggan.upsert({
            where: { id_pelanggan: cust.customerNo },
            update: {
              nama: cust.name,
              kategori_pelanggan: cust.customerGroup?.name || 'Umum',
              non_aktif: cust.suspended || false,
              kota_pengiriman: cust.shipCity,
              provinsi_pengiriman: cust.shipProvince,
              alamat_lengkap_pengiriman: cust.shipStreet,
              synced_at: new Date(),
            },
            create: {
              id_pelanggan: cust.customerNo,
              nama: cust.name,
              kategori_pelanggan: cust.customerGroup?.name || 'Umum',
              non_aktif: cust.suspended || false,
              kota_pengiriman: cust.shipCity,
              provinsi_pengiriman: cust.shipProvince,
              alamat_lengkap_pengiriman: cust.shipStreet,
              tgl_jam_pembuatan: new Date(),
              synced_at: new Date(),
            },
          });
          count++;
        }
      }
    );

    return count;
  }

  private static async pullFakturPenjualan(host: string, headers: Record<string, string>, fullHistory: boolean = false): Promise<number> {
    // API endpoint: POST /api/sales-invoice/list.do
    // Tanpa startDate/endDate & paginasi, Accurate hanya mengembalikan satu
    // halaman data terbaru (±100-200 baris) dan histori lama diam-diam hilang.
    const { startDate, endDate } = getSyncDateRange(fullHistory);
    let count = 0;

    await fetchAllAccuratePages(
      `${host}/accurate/api/sales-invoice/list.do`,
      headers,
      {
        fields: 'id,number,transDate,customer,totalAmount,paymentAmount,salesman',
        startDate,
        endDate,
      },
      async (invoices) => {
        for (const inv of invoices) {
          if (!inv.number || !inv.transDate) {
            logger.warn(`Lewati baris invoice tidak lengkap dari Accurate (id=${inv.id}): number/transDate kosong.`);
            continue;
          }
          const customerNo = inv.customer?.customerNo || 'CUST-UNKNOWN';

          // 1. Ensure customer exists to satisfy foreign key constraints
          await prisma.pelanggan.upsert({
            where: { id_pelanggan: customerNo },
            update: {},
            create: {
              id_pelanggan: customerNo,
              nama: inv.customer?.name || 'Pelanggan Baru',
              synced_at: new Date(),
            },
          });

          // 3. sales-invoice/list.do tidak pernah mengembalikan detailList terisi
          // (walau field diminta) — barisnya harus diambil lewat detail.do per invoice.
          // Salesman juga tidak tersedia sebagai objek di level invoice/list maupun
          // per baris item — hanya ada ID mentah "masterSalesmanId" di level invoice
          // (sama seperti sales-return/detail.do), yang harus di-resolve ke kode/nama
          // karyawan lewat employee/detail.do.
          // Panggilan ini di-throttle (jeda + retry pada 429) agar tidak
          // membanjiri rate limit Accurate saat memproses banyak invoice.
          let detailItems: any[] = [];
          let masterSalesmanId: number | null = null;
          try {
            const detailRes = await axiosGetWithRetry(`${host}/accurate/api/sales-invoice/detail.do`, {
              params: { id: inv.id },
              headers,
              maxRedirects: 5,
            });
            detailItems = detailRes.data?.d?.detailItem || detailRes.data?.d?.detailList || [];
            masterSalesmanId = detailRes.data?.d?.masterSalesmanId ?? null;
          } catch (detailErr: any) {
            logger.error(`Gagal ambil detail invoice id=${inv.id} saat sync: ${detailErr.message}`);
          }
          await sleep(ACCURATE_CALL_DELAY_MS);

          let salesId = 'SALES-UNKNOWN';
          let salesName = 'General Sales';
          if (masterSalesmanId != null) {
            try {
              const empRes = await axiosGetWithRetry(`${host}/accurate/api/employee/detail.do`, {
                params: { id: String(masterSalesmanId) },
                headers,
                maxRedirects: 5,
              });
              const emp = empRes.data?.d;
              if (emp) {
                salesId = emp.number || salesId;
                salesName = emp.name || salesName;
              }
            } catch (empErr: any) {
              logger.error(`Gagal ambil employee id=${masterSalesmanId} saat sync: ${empErr.message}`);
            }
            await sleep(ACCURATE_CALL_DELAY_MS);
          }

          // 2. Create/Update Invoice
          await prisma.fakturPenjualan.upsert({
            where: { nomor: inv.number },
            update: {
              id_pelanggan: customerNo,
              id_karyawan_penjual_utama: salesId,
              tanggal: parseAccurateDate(inv.transDate),
              total: inv.totalAmount || 0,
              pembayaran: inv.paymentAmount || 0,
              synced_at: new Date(),
            },
            create: {
              nomor: inv.number,
              id_pelanggan: customerNo,
              id_karyawan_penjual_utama: salesId,
              tanggal: parseAccurateDate(inv.transDate),
              total: inv.totalAmount || 0,
              pembayaran: inv.paymentAmount || 0,
              synced_at: new Date(),
            },
          });

          // Delete existing invoice details first before overwriting, to prevent duplicate entries
          await prisma.rincianPenjualanBarang.deleteMany({
            where: { nomor: inv.number },
          });

          for (const line of detailItems) {
            const itemNo = line.item?.no || 'BRG-UNKNOWN';
            const itemName = line.item?.name || 'Barang Hilang';

            // Ensure item master exists for FK constraint
            await prisma.barangJasa.upsert({
              where: { kode_barang: itemNo },
              update: {},
              create: {
                kode_barang: itemNo,
                nama_barang: itemName,
                kategori_barang: 'Umum',
                tgl_jam_pembuatan: new Date(),
                kts_gdng_pengguna: 0,
                kts_semua_gdng: 0,
                synced_at: new Date(),
              },
            });

            await prisma.rincianPenjualanBarang.create({
              data: {
                nomor: inv.number,
                kode: itemNo,
                nama_barang: itemName,
                kuantitas: line.quantity || 0,
                harga: line.unitPrice || 0,
                total_harga: (line.quantity || 0) * (line.unitPrice || 0),
                penjualan: (line.quantity || 0) * (line.unitPrice || 0),
                tanggal: parseAccurateDate(inv.transDate),
                nama_pelanggan: inv.customer?.name || 'Pelanggan Baru',
                nama_tenaga_penjual: salesName,
                id_karyawan_tenaga_penjual: salesId,
                synced_at: new Date(),
              },
            });
          }
          count++;
        }
      }
    );

    return count;
  }

  private static async pullMutasiSerialNumber(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: GET /api/report/serial-number-mutation.do
    // itemNo adalah parameter WAJIB (per dokumentasi resmi Accurate), sehingga
    // request harus dilakukan per barang, bukan sekali panggil untuk semua barang.
    const items = await prisma.barangJasa.findMany({ select: { kode_barang: true } });
    let count = 0;

    for (const item of items) {
      try {
        const response = await axios.get(
          `${host}/accurate/api/report/serial-number-mutation.do`,
          {
            params: { itemNo: item.kode_barang },
            headers,
            maxRedirects: 5,
          }
        );

        if (!response.data || !response.data.d) continue;

        const rows: any[] = Array.isArray(response.data.d) ? response.data.d : [response.data.d];

        for (const row of rows) {
          await prisma.mutasiSerialNumber.create({
            data: {
              kode_barang: row.itemNo || item.kode_barang,
              serial_number: row.serialNumber || '',
              tanggal: parseAccurateDate(row.date || row.transDate),
              tipe_mutasi: row.transType || 'UNKNOWN',
              jumlah: row.quantity || 0,
              nama_gudang: row.warehouseName || null,
              keterangan: row.description || null,
              synced_at: new Date(),
            },
          });
          count++;
        }
      } catch {
        // Lewati item yang gagal dan lanjutkan ke item berikutnya
      }
    }

    return count;
  }

  private static async pullRingkasanMutasiStok(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: GET /api/report/stock-mutation-summary.do
    // Requires fromDate, itemNo, toDate (wajib) — kita gunakan 1 tahun terakhir sebagai default
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 1);

    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const items = await prisma.barangJasa.findMany({ select: { kode_barang: true, nama_barang: true } });
    let count = 0;

    for (const item of items) {
      try {
        const response = await axios.get(
          `${host}/accurate/api/report/stock-mutation-summary.do`,
          {
            params: {
              itemNo: item.kode_barang,
              fromDate: fmt(fromDate),
              toDate: fmt(toDate),
            },
            headers,
            maxRedirects: 5,
          }
        );

        if (!response.data || !response.data.d) continue;

        const rows: any[] = Array.isArray(response.data.d) ? response.data.d : [response.data.d];

        for (const row of rows) {
          await prisma.ringkasanMutasiStok.create({
            data: {
              kode_barang: item.kode_barang,
              nama_barang: item.nama_barang,
              tanggal_mulai: fromDate,
              tanggal_akhir: toDate,
              nama_gudang: row.warehouseName || null,
              stok_awal: row.beginningBalance || 0,
              masuk: row.quantityIn || 0,
              keluar: row.quantityOut || 0,
              stok_akhir: row.endingBalance || 0,
              synced_at: new Date(),
            },
          });
          count++;
        }
      } catch {
        // Lewati item yang gagal dan lanjutkan ke item berikutnya
      }
    }

    return count;
  }

  private static async pullWorkOrder(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: GET /api/report/work-order-detail.do
    // Tidak ada parameter wajib selain workOrderNo — kita ambil list dulu jika ada endpoint list
    // Fallback: gunakan work-order/list.do untuk mendapatkan semua nomor WO
    const listResponse = await axios.post(
      `${host}/accurate/api/work-order/list.do`,
      new URLSearchParams({ fields: 'number,transDate,item,targetQuantity,realizedQuantity,status,description' }).toString(),
      {
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 5,
      }
    );

    if (!listResponse.data || !listResponse.data.d) {
      throw new Error(listResponse.data?.message || 'No work order data returned');
    }

    const orders = listResponse.data.d;
    let count = 0;

    for (const wo of orders) {
      await prisma.workOrder.upsert({
        where: { nomor_wo: wo.number },
        update: {
          tanggal: parseAccurateDate(wo.transDate),
          kode_barang_hasil: wo.item?.no || null,
          nama_barang_hasil: wo.item?.name || null,
          kuantitas_target: wo.targetQuantity || 0,
          kuantitas_realisasi: wo.realizedQuantity || 0,
          status: wo.status || 'UNKNOWN',
          keterangan: wo.description || null,
          synced_at: new Date(),
        },
        create: {
          nomor_wo: wo.number,
          tanggal: parseAccurateDate(wo.transDate),
          kode_barang_hasil: wo.item?.no || null,
          nama_barang_hasil: wo.item?.name || null,
          kuantitas_target: wo.targetQuantity || 0,
          kuantitas_realisasi: wo.realizedQuantity || 0,
          status: wo.status || 'UNKNOWN',
          keterangan: wo.description || null,
          synced_at: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  private static async pullReturPenjualan(host: string, headers: Record<string, string>, fullHistory: boolean = false): Promise<number> {
    // API endpoint: POST /api/sales-return/list.do
    // sales-return/list.do tidak menyertakan objek "salesman" seperti sales-invoice.
    // Satu-satunya cara mendapatkan tenaga penjual adalah lewat sales-return/detail.do
    // (field "masterSalesmanId", hanya ID numerik internal), lalu resolve ID tersebut
    // ke kode karyawan via employee/detail.do.
    const { startDate, endDate } = getSyncDateRange(fullHistory);
    let count = 0;

    await fetchAllAccuratePages(
      `${host}/accurate/api/sales-return/list.do`,
      headers,
      {
        fields: 'id,number,transDate,customer,totalAmount',
        startDate,
        endDate,
      },
      async (returns) => {
        // Panggilan detail/employee di-throttle sequentially (jeda + retry pada
        // 429) alih-alih Promise.all paralel, agar tidak membanjiri rate limit
        // Accurate saat memproses banyak retur sekaligus.
        const masterSalesmanIds = await throttledMap(returns, async (ret) => {
          try {
            const detailRes = await axiosGetWithRetry(`${host}/accurate/api/sales-return/detail.do`, {
              params: { id: String(ret.id) },
              headers,
              maxRedirects: 5,
            });
            return detailRes.data?.d?.masterSalesmanId ?? null;
          } catch (detailErr: any) {
            logger.error(`Gagal ambil detail retur id=${ret.id} saat sync: ${detailErr.message}`);
            return null;
          }
        });

        const uniqueSalesmanIds = Array.from(new Set(masterSalesmanIds.filter((id): id is number => id != null)));
        const salesmanById = new Map<number, { number: string; name: string }>();
        await throttledMap(uniqueSalesmanIds, async (id) => {
          try {
            const empRes = await axiosGetWithRetry(`${host}/accurate/api/employee/detail.do`, {
              params: { id: String(id) },
              headers,
              maxRedirects: 5,
            });
            const emp = empRes.data?.d;
            if (emp) salesmanById.set(id, { number: emp.number || '', name: emp.name || '' });
          } catch (empErr: any) {
            logger.error(`Gagal ambil employee id=${id} saat sync: ${empErr.message}`);
          }
        });

        for (let i = 0; i < returns.length; i++) {
          const ret = returns[i];
          if (!ret.number || !ret.transDate) {
            logger.warn(`Lewati baris retur tidak lengkap dari Accurate (id=${ret.id}): number/transDate kosong.`);
            continue;
          }
          const customerNo = ret.customer?.customerNo || 'CUST-UNKNOWN';
          const salesman = masterSalesmanIds[i] != null ? salesmanById.get(masterSalesmanIds[i]) : undefined;
          const salesId = salesman?.number || 'SALES-UNKNOWN';

          // Ensure customer exists for FK constraint
          await prisma.pelanggan.upsert({
            where: { id_pelanggan: customerNo },
            update: {},
            create: {
              id_pelanggan: customerNo,
              nama: ret.customer?.name || 'Pelanggan Baru',
              synced_at: new Date(),
            },
          });

          await prisma.returPenjualan.upsert({
            where: { nomor: ret.number },
            update: {
              id_pelanggan: customerNo,
              id_karyawan_penjual_utama: salesId,
              tanggal: parseAccurateDate(ret.transDate),
              total: ret.totalAmount || 0,
              pembayaran_faktur_penjualan: ret.totalAmount || 0,
              nilai_retur_faktur: ret.totalAmount || 0,
              synced_at: new Date(),
            },
            create: {
              nomor: ret.number,
              id_pelanggan: customerNo,
              id_karyawan_penjual_utama: salesId,
              tanggal: parseAccurateDate(ret.transDate),
              total: ret.totalAmount || 0,
              pembayaran_faktur_penjualan: ret.totalAmount || 0,
              nilai_retur_faktur: ret.totalAmount || 0,
              synced_at: new Date(),
            },
          });
          count++;
        }
      }
    );

    return count;
  }

  /**
   * Pull Rincian Penjualan per Barang.
   *
   * Accurate tidak menyediakan endpoint /api/report/get-sales-per-item.do —
   * endpoint tersebut tidak ada di Daftar API resmi Accurate Online
   * (account.accurate.id/developer/api-docs.do). Data rincian penjualan per
   * barang diturunkan dari detail.do per invoice, sama seperti pendekatan
   * pullFakturPenjualan dan reportController.ts — sales-invoice/list.do tidak
   * pernah mengembalikan detailList/salesman terisi walau field diminta.
   *
   * Salesman tidak tersedia per baris item — hanya ada ID mentah
   * "masterSalesmanId" di level invoice, yang di-resolve ke kode/nama
   * karyawan lewat employee/detail.do (sama seperti pullFakturPenjualan).
   */
  private static async pullRincianPenjualanBarang(host: string, headers: Record<string, string>, fullHistory: boolean = false): Promise<number> {
    const { startDate, endDate } = getSyncDateRange(fullHistory);
    let count = 0;

    await fetchAllAccuratePages(
      `${host}/accurate/api/sales-invoice/list.do`,
      headers,
      {
        fields: 'id,number,transDate,customer',
        startDate,
        endDate,
      },
      async (invoices) => {
        for (const inv of invoices) {
          if (!inv.number || !inv.transDate) {
            logger.warn(`Lewati baris invoice tidak lengkap dari Accurate (id=${inv.id}): number/transDate kosong.`);
            continue;
          }

          let detailItems: any[] = [];
          let masterSalesmanId: number | null = null;
          try {
            const detailRes = await axiosGetWithRetry(`${host}/accurate/api/sales-invoice/detail.do`, {
              params: { id: inv.id },
              headers,
              maxRedirects: 5,
            });
            detailItems = detailRes.data?.d?.detailItem || detailRes.data?.d?.detailList || [];
            masterSalesmanId = detailRes.data?.d?.masterSalesmanId ?? null;
          } catch (detailErr: any) {
            logger.error(`Gagal ambil detail invoice id=${inv.id} saat sync: ${detailErr.message}`);
          }
          await sleep(ACCURATE_CALL_DELAY_MS);

          let salesId = 'SALES-UNKNOWN';
          let salesName = 'General Sales';
          if (masterSalesmanId != null) {
            try {
              const empRes = await axiosGetWithRetry(`${host}/accurate/api/employee/detail.do`, {
                params: { id: String(masterSalesmanId) },
                headers,
                maxRedirects: 5,
              });
              const emp = empRes.data?.d;
              if (emp) {
                salesId = emp.number || salesId;
                salesName = emp.name || salesName;
              }
            } catch (empErr: any) {
              logger.error(`Gagal ambil employee id=${masterSalesmanId} saat sync: ${empErr.message}`);
            }
            await sleep(ACCURATE_CALL_DELAY_MS);
          }

          // Hapus rincian lama invoice ini agar tidak duplikat dengan sync sebelumnya
          await prisma.rincianPenjualanBarang.deleteMany({
            where: { nomor: inv.number },
          });

          for (const line of detailItems) {
            const itemNo = line.item?.no || 'BRG-UNKNOWN';
            const itemName = line.item?.name || 'Barang Tidak Diketahui';

            // Pastikan barang ada di master
            await prisma.barangJasa.upsert({
              where: { kode_barang: itemNo },
              update: {},
              create: {
                kode_barang: itemNo,
                nama_barang: itemName,
                kategori_barang: 'Umum',
                tgl_jam_pembuatan: new Date(),
                kts_gdng_pengguna: 0,
                kts_semua_gdng: 0,
                synced_at: new Date(),
              },
            });

            const kuantitas = line.quantity || 0;
            const hargaSatuan = line.unitPrice || line.basePrice || 0;

            await prisma.rincianPenjualanBarang.create({
              data: {
                nomor: inv.number,
                kode: itemNo,
                nama_barang: itemName,
                kuantitas,
                harga: hargaSatuan,
                total_harga: line.amount || (kuantitas * hargaSatuan),
                penjualan: line.amount || (kuantitas * hargaSatuan),
                tanggal: parseAccurateDate(inv.transDate),
                nama_pelanggan: inv.customer?.name || 'Umum',
                nama_tenaga_penjual: salesName,
                id_karyawan_tenaga_penjual: salesId,
                synced_at: new Date(),
              },
            });
            count++;
          }
        }
      }
    );

    return count;
  }
}
