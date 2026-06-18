import axios from 'axios';
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
   * Generate Accurate Online Authorization URL
   * Accurate Online menggunakan OAuth 2.0 tanpa explicit scope parameter
   */
  static getAuthUrl(): string {
    const clientId = config.accurate.clientId || 'your_client_id';
    const redirectUri = config.accurate.redirectUri;
    
    // Build URL - Accurate tidak memerlukan scope parameter
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
    });
    
    return `https://account.accurate.id/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  static async exchangeCodeForToken(code: string): Promise<any> {
    if (config.accurate.mock) {
      logger.info('OAuth Exchange code for token (MOCK MODE)');
      const mockTokens = {
        access_token: 'mock_access_token_' + Math.random().toString(36).substring(2),
        refresh_token: 'mock_refresh_token_' + Math.random().toString(36).substring(2),
        expires_in: 3600,
      };
      await this.saveSetting('ACCURATE_ACCESS_TOKEN', mockTokens.access_token);
      await this.saveSetting('ACCURATE_REFRESH_TOKEN', mockTokens.refresh_token);
      return mockTokens;
    }

    try {
      const clientId = config.accurate.clientId;
      const clientSecret = config.accurate.clientSecret;
      const redirectUri = config.accurate.redirectUri;

      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await axios.post(
        'https://account.accurate.id/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token } = response.data;
      await this.saveSetting('ACCURATE_ACCESS_TOKEN', access_token);
      await this.saveSetting('ACCURATE_REFRESH_TOKEN', refresh_token);
      
      logger.info('OAuth Tokens exchanged and saved successfully.');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to exchange auth code:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  static async refreshAccessToken(): Promise<string> {
    const refreshToken = await this.getSetting('ACCURATE_REFRESH_TOKEN');
    if (!refreshToken) {
      throw new Error('No refresh token available. Re-auth required.');
    }

    if (config.accurate.mock) {
      logger.info('Refresh Access Token (MOCK MODE)');
      const newAccessToken = 'mock_access_token_refreshed_' + Math.random().toString(36).substring(2);
      await this.saveSetting('ACCURATE_ACCESS_TOKEN', newAccessToken);
      return newAccessToken;
    }

    try {
      const clientId = config.accurate.clientId;
      const clientSecret = config.accurate.clientSecret;

      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await axios.post(
        'https://account.accurate.id/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token } = response.data;
      await this.saveSetting('ACCURATE_ACCESS_TOKEN', access_token);
      if (refresh_token) {
        await this.saveSetting('ACCURATE_REFRESH_TOKEN', refresh_token);
      }
      
      logger.info('Access Token refreshed successfully.');
      return access_token;
    } catch (error: any) {
      logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get user databases listing from Accurate
   */
  static async getDatabaseList(): Promise<any[]> {
    if (config.accurate.mock) {
      logger.info('Get database listing (MOCK MODE)');
      return [
        { id: '12345', name: 'PT. Maju Bersama (MOCK)' },
        { id: '67890', name: 'CV. Bintang Mas (MOCK)' },
      ];
    }

    const accessToken = await this.getSetting('ACCURATE_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Access token not available. Please authorize first.');
    }

    try {
      const response = await axios.get('https://api.accurate.id/api/db-list.do', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.data && response.data.d) {
        return response.data.d; // returns array of databases
      }
      return [];
    } catch (error: any) {
      logger.error('Failed to fetch database list:', error.response?.data || error.message);
      throw new Error('Failed to fetch database list');
    }
  }

  /**
   * Open database session and retrieve session ID and Host
   */
  static async openDbSession(dbId: string): Promise<any> {
    if (config.accurate.mock) {
      logger.info(`Open database session for ID ${dbId} (MOCK MODE)`);
      const sessionInfo = {
        session: 'mock_session_key_998877',
        host: 'https://api.accurate.id',
      };
      await this.saveSetting('ACCURATE_SESSION_ID', sessionInfo.session);
      await this.saveSetting('ACCURATE_SESSION_HOST', sessionInfo.host);
      await this.saveSetting('ACCURATE_DB_ID', dbId);
      return sessionInfo;
    }

    const accessToken = await this.getSetting('ACCURATE_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Access token not available. Please authorize first.');
    }

    try {
      const response = await axios.get(`https://api.accurate.id/api/open-db.do?id=${dbId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.data && response.data.status) {
        const { session, host } = response.data;
        await this.saveSetting('ACCURATE_SESSION_ID', session);
        await this.saveSetting('ACCURATE_SESSION_HOST', host);
        await this.saveSetting('ACCURATE_DB_ID', dbId);
        logger.info(`Database session opened: session=${session}, host=${host}`);
        return { session, host };
      }
      throw new Error(response.data.message || 'Failed to open database');
    } catch (error: any) {
      logger.error('Failed to open database session:', error.response?.data || error.message);
      throw new Error('Failed to open database session');
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
      const accessToken = await this.getSetting('ACCURATE_ACCESS_TOKEN');
      const session = await this.getSetting('ACCURATE_SESSION_ID');
      const host = await this.getSetting('ACCURATE_SESSION_HOST');

      if (!accessToken || !session || !host) {
        throw new Error('Accurate authentication session is missing. Please authorize and open database first.');
      }

      // Fetch data depending on the module
      if (moduleName === 'Barang & Jasa') {
        syncCount = await this.pullBarangJasa(host, session, accessToken);
      } else if (moduleName === 'Pelanggan') {
        syncCount = await this.pullPelanggan(host, session, accessToken);
      } else if (moduleName === 'Faktur Penjualan') {
        syncCount = await this.pullFakturPenjualan(host, session, accessToken);
      } else if (moduleName === 'Retur Penjualan') {
        syncCount = await this.pullReturPenjualan(host, session, accessToken);
      } else if (moduleName === 'Rincian Penjualan Barang') {
        syncCount = await this.pullRincianPenjualanBarang(host, session, accessToken);
      } else if (moduleName === 'Mutasi Serial Number') {
        syncCount = await this.pullMutasiSerialNumber(host, session, accessToken);
      } else if (moduleName === 'Ringkasan Mutasi Stok') {
        syncCount = await this.pullRingkasanMutasiStok(host, session, accessToken);
      } else if (moduleName === 'Work Order') {
        syncCount = await this.pullWorkOrder(host, session, accessToken);
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

  private static async pullBarangJasa(host: string, session: string, token: string): Promise<number> {
    // API endpoint: POST /api/item/list.do
    const response = await axios.post(
      `${host}/api/item/list.do`,
      new URLSearchParams({
        session,
        fields: 'no,name,itemType,itemCategory,upToDate,suspended,quantity,totalQuantity',
      }).toString(),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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

  private static async pullPelanggan(host: string, session: string, token: string): Promise<number> {
    // API endpoint: POST /api/customer/list.do
    const response = await axios.post(
      `${host}/api/customer/list.do`,
      new URLSearchParams({
        session,
        fields: 'id,name,customerNo,customerGroup,suspended,shipZipCode,shipCity,shipProvince,shipStreet',
      }).toString(),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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

  private static async pullFakturPenjualan(host: string, session: string, token: string): Promise<number> {
    // API endpoint: POST /api/sales-invoice/list.do
    const response = await axios.post(
      `${host}/api/sales-invoice/list.do`,
      new URLSearchParams({
        session,
        fields: 'number,transDate,customer,totalAmount,paymentAmount,salesman,detailList',
      }).toString(),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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

  private static async pullMutasiSerialNumber(host: string, session: string, token: string): Promise<number> {
    // API endpoint: GET /api/report/serial-number-mutation.do
    const response = await axios.get(
      `${host}/api/report/serial-number-mutation.do`,
      {
        params: { session },
        headers: { 'Authorization': `Bearer ${token}` },
      }
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

  private static async pullRingkasanMutasiStok(host: string, session: string, token: string): Promise<number> {
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
          `${host}/api/report/stock-mutation-summary.do`,
          {
            params: {
              session,
              itemNo: item.kode_barang,
              fromDate: fmt(fromDate),
              toDate: fmt(toDate),
            },
            headers: { 'Authorization': `Bearer ${token}` },
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

  private static async pullWorkOrder(host: string, session: string, token: string): Promise<number> {
    // API endpoint: GET /api/report/work-order-detail.do
    // Tidak ada parameter wajib selain workOrderNo — kita ambil list dulu jika ada endpoint list
    // Fallback: gunakan work-order/list.do untuk mendapatkan semua nomor WO
    const listResponse = await axios.post(
      `${host}/api/work-order/list.do`,
      new URLSearchParams({ session, fields: 'number,transDate,item,targetQuantity,realizedQuantity,status,description' }).toString(),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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

  private static async pullReturPenjualan(host: string, session: string, token: string): Promise<number> {
    // API endpoint: POST /api/sales-return/list.do
    const response = await axios.post(
      `${host}/api/sales-return/list.do`,
      new URLSearchParams({
        session,
        fields: 'number,transDate,customer,totalAmount,salesman',
      }).toString(),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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
  private static async pullRincianPenjualanBarang(host: string, session: string, token: string): Promise<number> {
    // Parameter Request yang diperlukan (dari dokumentasi API):
    // - session (wajib)
    // - itemNo (tidak wajib, tapi bisa kosong untuk semua barang)

    try {
      const response = await axios.get(
        `${host}/api/report/get-sales-per-item.do`,
        {
          params: {
            session,
            // Kosongkan itemNo untuk ambil semua barang
          },
          headers: { 'Authorization': `Bearer ${token}` },
        }
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
  public static async pullDaftarFakturPenjualan(host: string, session: string, token: string): Promise<number> {
    try {
      // Ambil daftar faktur penjualan dari Report API
      const response = await axios.get(
        `${host}/api/report/sales-invoice-list.do`,
        {
          params: { session },
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.data || !response.data.d) {
        // Fallback ke sales-invoice/list.do jika report API tidak ada
        return await this.pullFakturPenjualan(host, session, token);
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
      return await this.pullFakturPenjualan(host, session, token);
    }
  }
}
