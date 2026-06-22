import axios from 'axios';
import crypto from 'crypto';
import prisma from './db';
import { encrypt, decrypt } from './cryptoService';
import { config } from '../config';
import logger from './logger';
import { SyncStatus } from '@prisma/client';

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
      const dbAlias = dataUsaha?.alias;

      if (!host) {
        throw new Error(`Response Accurate tidak menyertakan host Data Usaha: ${JSON.stringify(response.data.d)}`);
      }

      await this.saveSetting('ACCURATE_SESSION_HOST', host);
      if (dbId) await this.saveSetting('ACCURATE_DB_ID', String(dbId));
      if (dbAlias) await this.saveSetting('ACCURATE_DB_NAME', dbAlias);

      logger.info(`Accurate API Token verified: host=${host}, db=${dbAlias}`);
      return { host, dbAlias, dbId };
    } catch (error: any) {
      const accurateError = error.response?.data;
      const detail = accurateError?.d || accurateError?.message || error.message;
      logger.error('Failed to verify API Token:', accurateError || error.message);
      throw new Error(typeof detail === 'string' ? detail : (error.message || 'Gagal memverifikasi API Token'));
    }
  }

  /**
   * Synchronize modules from Accurate Online to MySQL
   */
  static async syncModule(moduleName: string): Promise<{ success: boolean; count: number; error?: string }> {
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
        syncCount = await this.pullFakturPenjualan(host, headers);
      } else if (moduleName === 'Retur Penjualan') {
        syncCount = await this.pullReturPenjualan(host, headers);
      } else if (moduleName === 'Rincian Penjualan Barang') {
        syncCount = await this.pullRincianPenjualanBarang(host, headers);
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
      const errorMessage = error.message || 'Unknown integration error';
      logger.error(`Sync FAILED for ${moduleName}:`, error);

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
    const response = await axios.post(
      `${host}/accurate/api/item/list.do`,
      new URLSearchParams({
        fields: 'no,name,itemType,itemCategory,upToDate,suspended,quantity,totalQuantity',
      }).toString(),
      {
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 5,
      }
    );

    if (!response.data || !response.data.d) {
      throw new Error(response.data.message || 'No item data returned');
    }

    const items = response.data.d;
    let count = 0;

    for (const item of items) {
      // Mapping field Accurate -> Database
      await prisma.barangJasa.upsert({
        where: { kode_barang: item.no },
        update: {
          nama_barang: item.name,
          kategori_barang: item.itemCategory?.name || 'Umum',
          non_aktif: item.suspended || false,
          kts_gdng_pengguna: item.quantity || 0,
          kts_semua_gdng: item.totalQuantity || 0,
          synced_at: new Date(),
        },
        create: {
          kode_barang: item.no,
          nama_barang: item.name,
          kategori_barang: item.itemCategory?.name || 'Umum',
          nama_merek_barang: '',
          non_aktif: item.suspended || false,
          tgl_jam_pembuatan: new Date(),
          kts_gdng_pengguna: item.quantity || 0,
          kts_semua_gdng: item.totalQuantity || 0,
          synced_at: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  private static async pullPelanggan(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: POST /api/customer/list.do
    const response = await axios.post(
      `${host}/accurate/api/customer/list.do`,
      new URLSearchParams({
        fields: 'id,name,customerNo,customerGroup,suspended,shipZipCode,shipCity,shipProvince,shipStreet',
      }).toString(),
      {
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 5,
      }
    );

    if (!response.data || !response.data.d) {
      throw new Error(response.data.message || 'No customer data returned');
    }

    const customers = response.data.d;
    let count = 0;

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

    return count;
  }

  private static async pullFakturPenjualan(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: POST /api/sales-invoice/list.do
    const response = await axios.post(
      `${host}/accurate/api/sales-invoice/list.do`,
      new URLSearchParams({
        fields: 'number,transDate,customer,totalAmount,paymentAmount,salesman,detailList',
      }).toString(),
      {
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 5,
      }
    );

    if (!response.data || !response.data.d) {
      throw new Error(response.data.message || 'No invoice data returned');
    }

    const invoices = response.data.d;
    let count = 0;

    for (const inv of invoices) {
      const customerNo = inv.customer?.customerNo || 'CUST-UNKNOWN';
      const salesId = inv.salesman?.salesNo || 'SALES-UNKNOWN';
      const salesName = inv.salesman?.name || 'General Sales';

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

      // 2. Create/Update Invoice
      await prisma.fakturPenjualan.upsert({
        where: { nomor: inv.number },
        update: {
          id_pelanggan: customerNo,
          id_karyawan_penjual_utama: salesId,
          tanggal: new Date(inv.transDate),
          total: inv.totalAmount || 0,
          pembayaran: inv.paymentAmount || 0,
          synced_at: new Date(),
        },
        create: {
          nomor: inv.number,
          id_pelanggan: customerNo,
          id_karyawan_penjual_utama: salesId,
          tanggal: new Date(inv.transDate),
          total: inv.totalAmount || 0,
          pembayaran: inv.paymentAmount || 0,
          synced_at: new Date(),
        },
      });

      // Delete existing invoice details first before overwriting, to prevent duplicate entries
      await prisma.rincianPenjualanBarang.deleteMany({
        where: { nomor: inv.number },
      });

      // 3. Process Invoice Details list (detailList)
      if (inv.detailList && Array.isArray(inv.detailList)) {
        for (const line of inv.detailList) {
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
              tanggal: new Date(inv.transDate),
              nama_pelanggan: inv.customer?.name || 'Pelanggan Baru',
              nama_tenaga_penjual: salesName,
              id_karyawan_tenaga_penjual: salesId,
              synced_at: new Date(),
            },
          });
        }
      }
      count++;
    }

    return count;
  }

  private static async pullMutasiSerialNumber(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: GET /api/report/serial-number-mutation.do
    const response = await axios.get(
      `${host}/accurate/api/report/serial-number-mutation.do`,
      { headers, maxRedirects: 5 }
    );

    if (!response.data || !response.data.d) {
      throw new Error(response.data?.message || 'No serial number mutation data returned');
    }

    const rows = response.data.d;
    let count = 0;

    for (const row of rows) {
      await prisma.mutasiSerialNumber.create({
        data: {
          kode_barang: row.itemNo || '',
          serial_number: row.serialNumber || '',
          tanggal: new Date(row.date || row.transDate),
          tipe_mutasi: row.transType || 'UNKNOWN',
          jumlah: row.quantity || 0,
          nama_gudang: row.warehouseName || null,
          keterangan: row.description || null,
          synced_at: new Date(),
        },
      });
      count++;
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
          tanggal: new Date(wo.transDate),
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
          tanggal: new Date(wo.transDate),
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

  private static async pullReturPenjualan(host: string, headers: Record<string, string>): Promise<number> {
    // API endpoint: POST /api/sales-return/list.do
    const response = await axios.post(
      `${host}/accurate/api/sales-return/list.do`,
      new URLSearchParams({
        fields: 'number,transDate,customer,totalAmount,salesman',
      }).toString(),
      {
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 5,
      }
    );

    if (!response.data || !response.data.d) {
      throw new Error(response.data.message || 'No return data returned');
    }

    const returns = response.data.d;
    let count = 0;

    for (const ret of returns) {
      const customerNo = ret.customer?.customerNo || 'CUST-UNKNOWN';
      const salesId = ret.salesman?.salesNo || 'SALES-UNKNOWN';

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
          tanggal: new Date(ret.transDate),
          total: ret.totalAmount || 0,
          pembayaran_faktur_penjualan: ret.totalAmount || 0,
          nilai_retur_faktur: ret.totalAmount || 0,
          synced_at: new Date(),
        },
        create: {
          nomor: ret.number,
          id_pelanggan: customerNo,
          id_karyawan_penjual_utama: salesId,
          tanggal: new Date(ret.transDate),
          total: ret.totalAmount || 0,
          pembayaran_faktur_penjualan: ret.totalAmount || 0,
          nilai_retur_faktur: ret.totalAmount || 0,
          synced_at: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Pull Rincian Penjualan per Barang dari Report API Accurate
   * Endpoint: GET /api/report/get-sales-per-item.do (HTTP Method: GET, Scope: report_view)
   */
  private static async pullRincianPenjualanBarang(host: string, headers: Record<string, string>): Promise<number> {
    // Parameter Request yang diperlukan (dari dokumentasi API):
    // - itemNo (tidak wajib, kosongkan untuk ambil semua barang)

    try {
      const response = await axios.get(
        `${host}/accurate/api/report/get-sales-per-item.do`,
        { headers, maxRedirects: 5 }
      );

      if (!response.data || !response.data.d) {
        throw new Error(response.data?.message || 'No sales per item data returned');
      }

      const rows: any[] = Array.isArray(response.data.d) ? response.data.d : [response.data.d];
      let count = 0;

      for (const row of rows) {
        const itemNo = row.itemNo || row.kode || row.itemCode || 'UNKNOWN';
        const itemName = row.itemName || row.namaBarang || 'Barang Tidak Diketahui';
        
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

        // Insert rincian penjualan
        await prisma.rincianPenjualanBarang.create({
          data: {
            nomor: row.transactionNo || row.nomor || `INV-${Date.now()}-${count}`,
            kode: itemNo,
            nama_barang: itemName,
            kuantitas: row.quantity || row.kuantitas || 0,
            harga: row.unitPrice || row.harga || 0,
            total_harga: row.amount || row.totalHarga || 0,
            penjualan: row.salesAmount || row.penjualan || 0,
            tanggal: row.transDate ? new Date(row.transDate) : new Date(),
            nama_pelanggan: row.customerName || row.namaPelanggan || 'Umum',
            nama_tenaga_penjual: row.salesmanName || row.namaSales || 'General',
            id_karyawan_tenaga_penjual: row.salesmanId || row.idSales || 'SALES-001',
            synced_at: new Date(),
          },
        });
        count++;
      }

      return count;
    } catch (error: any) {
      logger.error('Failed to pull Rincian Penjualan per Barang:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Pull Daftar Faktur Penjualan dari Accurate Report API
   * Endpoint: GET /api/report/sales-invoice-list.do (Scope: report_view)
   * 
   * Data dari menu: Daftar Laporan > Penjualan > Daftar Faktur Penjualan
   * @note Currently not used but kept for future implementation
   */
  public static async pullDaftarFakturPenjualan(host: string, headers: Record<string, string>): Promise<number> {
    try {
      // Ambil daftar faktur penjualan dari Report API
      const response = await axios.get(
        `${host}/accurate/api/report/sales-invoice-list.do`,
        { headers, maxRedirects: 5 }
      );

      if (!response.data || !response.data.d) {
        // Fallback ke sales-invoice/list.do jika report API tidak ada
        return await this.pullFakturPenjualan(host, headers);
      }

      const invoices: any[] = Array.isArray(response.data.d) ? response.data.d : [response.data.d];
      let count = 0;

      for (const inv of invoices) {
        const customerNo = inv.customerNo || inv.customerId || 'UNKNOWN';
        const customerName = inv.customerName || 'Pelanggan Umum';
        
        // Pastikan pelanggan ada di database
        await prisma.pelanggan.upsert({
          where: { id_pelanggan: customerNo },
          update: { nama: customerName },
          create: {
            id_pelanggan: customerNo,
            nama: customerName,
            synced_at: new Date(),
          },
        });

        // Simpan faktur penjualan
        await prisma.fakturPenjualan.upsert({
          where: { nomor: inv.number || inv.invoiceNumber },
          update: {
            id_pelanggan: customerNo,
            tanggal: new Date(inv.transDate || inv.date),
            total: inv.totalAmount || inv.total || 0,
            pembayaran: inv.paidAmount || inv.paid || 0,
            synced_at: new Date(),
          },
          create: {
            nomor: inv.number || inv.invoiceNumber,
            id_pelanggan: customerNo,
            tanggal: new Date(inv.transDate || inv.date),
            total: inv.totalAmount || inv.total || 0,
            pembayaran: inv.paidAmount || inv.paid || 0,
            synced_at: new Date(),
          },
        });

        count++;
      }

      return count;
    } catch (error: any) {
      logger.error('Failed to pull Daftar Faktur Penjualan:', error.response?.data || error.message);
      // Fallback to existing method
      return await this.pullFakturPenjualan(host, headers);
    }
  }
}
