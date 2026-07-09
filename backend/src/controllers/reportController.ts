import axios from 'axios';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AccurateService } from '../services/accurateService';
import { config } from '../config';
import prisma from '../services/db';
import logger from '../services/logger';

/**
 * GET /report/rincian-penjualan-per-barang
 *
 * Live mode  : proxy langsung ke Accurate API /api/sales-invoice/list.do (detailList)
 * Mock/dev   : baca dari tabel rincian_penjualan_barang yang sudah di-sync dari Accurate
 */
export async function getRincianPenjualanPerBarang(req: AuthenticatedRequest, res: Response) {
  const startDate = req.query.startDate as string || '';
  const endDate   = req.query.endDate   as string || '';
  const q         = req.query.q         as string || '';
  const page      = parseInt(req.query.page  as string || '1',  10);
  const limit     = parseInt(req.query.limit as string || '20', 10);
  const skip      = (page - 1) * limit;

  // branchIds: comma-separated Accurate branch IDs, e.g. "1,2,3"
  const branchIdsParam = (req.query.branchIds as string || '').trim();
  const branchIds = branchIdsParam ? branchIdsParam.split(',').filter(Boolean) : [];

  // ── MOCK / DEV MODE ─────────────────────────────────────────────────────────
  // Baca dari DB lokal (data asli Accurate yang sudah di-sync sebelumnya)
  if (config.accurate.mock) {
    logger.info('getRincianPenjualanPerBarang — membaca dari DB lokal (mock/dev mode)');
    try {
      const where: any = {};

      if (startDate && endDate) {
        where.tanggal = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      if (q) {
        where.OR = [
          { nomor:               { contains: q } },
          { kode:                { contains: q } },
          { nama_barang:         { contains: q } },
          { nama_pelanggan:      { contains: q } },
          { nama_tenaga_penjual: { contains: q } },
        ];
      }

      const [rows, total] = await Promise.all([
        prisma.rincianPenjualanBarang.findMany({
          where,
          orderBy: { tanggal: 'desc' },
          skip,
          take: limit,
        }),
        prisma.rincianPenjualanBarang.count({ where }),
      ]);

      const data = rows.map(r => ({
        nomorFaktur:   r.nomor,
        tanggal:       r.tanggal,
        kodeBarang:    r.kode,
        namaBarang:    r.nama_barang,
        kategoriBarang: '',
        namaCustomer:  r.nama_pelanggan,
        namaSalesman:  r.nama_tenaga_penjual,
        namaCabang:    '',
        kuantitas:     Number(r.kuantitas),
        satuan:        'Unit',
        hargaSatuan:   Number(r.harga),
        diskon:        0,
        totalHarga:    Number(r.total_harga),
      }));

      return res.status(200).json({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        source: 'db',
      });
    } catch (err) {
      logger.error('Gagal membaca rincian_penjualan dari DB:', err);
      return res.status(500).json({ message: 'Gagal membaca data dari database' });
    }
  }

  // ── LIVE ACCURATE MODE ───────────────────────────────────────────────────────
  try {
    const host = await AccurateService.getSetting('ACCURATE_SESSION_HOST');

    if (!host) {
      return res.status(401).json({
        message: 'Belum terhubung ke Accurate. Silakan hubungkan akun Accurate terlebih dahulu di halaman Pengaturan.',
        code: 'NOT_CONNECTED',
      });
    }

    const headers = await AccurateService.getApiTokenHeaders();

    const params: Record<string, string> = {
      fields:   'number,transDate,customer,salesman,branch,detailList',
      pageSize: String(limit),
      page:     String(page),
    };

    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;
    if (branchIds.length === 1) params['filter.branchId'] = branchIds[0];

    logger.info(`Fetch Accurate sales-invoice/list.do host=${host} page=${page} fields=${params.fields}`);

    let response = await axios.get(`${host}/accurate/api/sales-invoice/list.do`, {
      params,
      headers,
      maxRedirects: 5,
    });

    if (!response.data || !response.data.s) {
      const errMsg = response.data?.d || response.data?.message || 'Response tidak valid dari Accurate';
      logger.error('Accurate API error:', errMsg);
      return res.status(502).json({ message: `Accurate API error: ${errMsg}` });
    }

    let invoices: any[] = response.data.d || [];
    let sp = response.data.sp || {};
    let branchDataAvailable = true;

    // Field "branch" kadang tidak dikenali Accurate untuk endpoint ini dan membuat
    // detailList kosong tanpa error eksplisit. Kalau rowCount > 0 tapi tidak ada
    // baris terisi, coba ulang tanpa field branch (tanpa data cabang).
    const hasAnyDetail = invoices.some((inv) => (inv.detailList || []).length > 0);
    if (!hasAnyDetail && (sp.rowCount || 0) > 0) {
      logger.warn(`Response kosong dengan field branch (rowCount=${sp.rowCount}), mencoba ulang tanpa field branch`);
      const fallbackParams = { ...params, fields: 'number,transDate,customer,salesman,detailList' };
      const fallbackRes = await axios.get(`${host}/accurate/api/sales-invoice/list.do`, {
        params: fallbackParams,
        headers,
        maxRedirects: 5,
      });
      if (fallbackRes.data?.s) {
        invoices = fallbackRes.data.d || [];
        sp = fallbackRes.data.sp || {};
        branchDataAvailable = false;
      }
    }

    if (!branchDataAvailable && branchIds.length > 0) {
      return res.status(502).json({
        message: 'Filter cabang tidak dapat diterapkan saat ini karena Accurate tidak mengembalikan data cabang pada laporan ini. Silakan hapus filter cabang atau coba lagi nanti.',
      });
    }

    const rows: any[] = [];

    for (const inv of invoices) {
      if (branchDataAvailable && branchIds.length > 0 && !branchIds.includes(String(inv.branch?.id ?? ''))) {
        continue;
      }

      for (const line of (inv.detailList || [])) {
        const namaBarang = line.item?.name  || line.itemName || '';
        const kodeBarang = line.item?.no    || line.itemNo   || '';

        if (q) {
          const s = q.toLowerCase();
          const hit =
            namaBarang.toLowerCase().includes(s) ||
            kodeBarang.toLowerCase().includes(s) ||
            (inv.number         || '').toLowerCase().includes(s) ||
            (inv.customer?.name || '').toLowerCase().includes(s) ||
            (inv.salesman?.name || '').toLowerCase().includes(s);
          if (!hit) continue;
        }

        const kuantitas   = line.quantity      || 0;
        const hargaSatuan = line.unitPrice      || line.basePrice || 0;
        const diskon      = line.discountAmount || 0;
        const totalHarga  = line.amount         || (kuantitas * hargaSatuan - diskon);

        rows.push({
          nomorFaktur:    inv.number,
          tanggal:        inv.transDate,
          kodeBarang,
          namaBarang,
          kategoriBarang: line.item?.itemCategory?.name || '',
          namaCustomer:   inv.customer?.name || '',
          namaSalesman:   inv.salesman?.name || '',
          namaCabang:     inv.branch?.name || '',
          kuantitas,
          satuan:         line.unit?.name || line.unitName || 'Unit',
          hargaSatuan,
          diskon,
          totalHarga,
        });
      }
    }

    return res.status(200).json({
      data: rows,
      pagination: {
        page,
        limit:      sp.pageSize  || limit,
        total:      sp.rowCount  || rows.length,
        totalPages: sp.pageCount || 1,
      },
      source: 'accurate',
    });

  } catch (error: any) {
    const status = error.response?.status;
    const msg    = error.response?.data?.d || error.response?.data?.message || error.message;

    if (status === 401) {
      logger.warn('Accurate token expired, needs re-auth');
      return res.status(401).json({
        message: `Sesi Accurate telah berakhir atau kredensial tidak valid${msg ? `: ${msg}` : ''}. Silakan hubungkan ulang di halaman Pengaturan.`,
        code: 'TOKEN_EXPIRED',
      });
    }

    logger.error('Gagal fetch rincian penjualan per barang dari Accurate:', msg);
    return res.status(502).json({
      message: `Gagal mengambil data dari Accurate: ${msg || 'Kesalahan tidak diketahui'}`,
    });
  }
}

/**
 * GET /report/cabang
 *
 * Daftar cabang (branch) dari Accurate, untuk mengisi filter cabang pada laporan.
 */
export async function getCabangList(_req: AuthenticatedRequest, res: Response) {
  if (config.accurate.mock) {
    return res.status(200).json({ data: [], source: 'db' });
  }

  try {
    const host = await AccurateService.getSetting('ACCURATE_SESSION_HOST');
    if (!host) {
      return res.status(401).json({
        message: 'Belum terhubung ke Accurate. Silakan hubungkan akun Accurate terlebih dahulu di halaman Pengaturan.',
        code: 'NOT_CONNECTED',
      });
    }

    const headers = await AccurateService.getApiTokenHeaders();

    const response = await axios.get(`${host}/accurate/api/branch/list.do`, {
      params: { fields: 'id,name', pageSize: '100' },
      headers,
      maxRedirects: 5,
    });

    if (!response.data || !response.data.s) {
      const errMsg = response.data?.d || response.data?.message || 'Response tidak valid dari Accurate';
      logger.error('Accurate API error (branch/list):', errMsg);
      return res.status(502).json({ message: `Accurate API error: ${errMsg}` });
    }

    const branches: any[] = response.data.d || [];
    const data = branches.map((b) => ({ id: b.id, nama: b.name }));

    return res.status(200).json({ data, source: 'accurate' });
  } catch (error: any) {
    const status = error.response?.status;
    const msg    = error.response?.data?.d || error.response?.data?.message || error.message;

    if (status === 401) {
      return res.status(401).json({
        message: `Sesi Accurate telah berakhir atau kredensial tidak valid${msg ? `: ${msg}` : ''}. Silakan hubungkan ulang di halaman Pengaturan.`,
        code: 'TOKEN_EXPIRED',
      });
    }

    logger.error('Gagal fetch daftar cabang dari Accurate:', msg);
    return res.status(502).json({
      message: `Gagal mengambil daftar cabang dari Accurate: ${msg || 'Kesalahan tidak diketahui'}`,
    });
  }
}

/**
 * GET /report/daftar-faktur-penjualan
 *
 * Live proxy langsung ke Accurate API /api/sales-invoice/list.do
 */
export async function getDaftarFakturPenjualan(req: AuthenticatedRequest, res: Response) {
  const startDate = req.query.startDate as string || '';
  const endDate   = req.query.endDate   as string || '';
  const q         = req.query.q         as string || '';
  const page      = parseInt(req.query.page  as string || '1',  10);
  const limit     = parseInt(req.query.limit as string || '10', 10);

  try {
    const host = await AccurateService.getSetting('ACCURATE_SESSION_HOST');
    if (!host) {
      return res.status(401).json({
        message: 'Belum terhubung ke Accurate. Silakan hubungkan akun Accurate terlebih dahulu di halaman Pengaturan.',
        code: 'NOT_CONNECTED',
      });
    }

    const headers = await AccurateService.getApiTokenHeaders();

    const params: Record<string, string> = {
      fields:   'id,number,transDate,customer,salesman,totalAmount,paymentAmount',
      pageSize: String(limit),
      page:     String(page),
    };
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;
    if (q)         params.keywords  = q;

    const response = await axios.get(`${host}/accurate/api/sales-invoice/list.do`, {
      params,
      headers,
      maxRedirects: 5,
    });

    if (!response.data || !response.data.s) {
      const errMsg = response.data?.d || response.data?.message || 'Response tidak valid dari Accurate';
      logger.error('Accurate API error (daftar-faktur):', errMsg);
      return res.status(502).json({ message: `Accurate API error: ${errMsg}` });
    }

    const invoices: any[] = response.data.d || [];
    const sp = response.data.sp || {};

    const rows = invoices.map((inv) => ({
      id: inv.id,
      nomor: inv.number,
      id_pelanggan: inv.customer?.customerNo || '',
      nama_pelanggan: inv.customer?.name || '',
      id_karyawan_penjual_utama: inv.salesman?.salesNo || '',
      tanggal: inv.transDate,
      total: inv.totalAmount || 0,
      pembayaran: inv.paymentAmount || 0,
    }));

    return res.status(200).json({
      data: rows,
      pagination: {
        page,
        limit:      sp.pageSize  || limit,
        total:      sp.rowCount  || rows.length,
        totalPages: sp.pageCount || 1,
      },
      source: 'accurate',
    });
  } catch (error: any) {
    const status = error.response?.status;
    const msg    = error.response?.data?.d || error.response?.data?.message || error.message;

    if (status === 401) {
      return res.status(401).json({
        message: `Sesi Accurate telah berakhir atau kredensial tidak valid${msg ? `: ${msg}` : ''}. Silakan hubungkan ulang di halaman Pengaturan.`,
        code: 'TOKEN_EXPIRED',
      });
    }

    logger.error('Gagal fetch daftar faktur penjualan dari Accurate:', msg);
    return res.status(502).json({
      message: `Gagal mengambil data dari Accurate: ${msg || 'Kesalahan tidak diketahui'}`,
    });
  }
}

/**
 * GET /report/daftar-retur-penjualan
 *
 * Live proxy langsung ke Accurate API /api/sales-return/list.do
 */
export async function getDaftarReturPenjualan(req: AuthenticatedRequest, res: Response) {
  const startDate = req.query.startDate as string || '';
  const endDate   = req.query.endDate   as string || '';
  const q         = req.query.q         as string || '';
  const page      = parseInt(req.query.page  as string || '1',  10);
  const limit     = parseInt(req.query.limit as string || '10', 10);

  try {
    const host = await AccurateService.getSetting('ACCURATE_SESSION_HOST');
    if (!host) {
      return res.status(401).json({
        message: 'Belum terhubung ke Accurate. Silakan hubungkan akun Accurate terlebih dahulu di halaman Pengaturan.',
        code: 'NOT_CONNECTED',
      });
    }

    const headers = await AccurateService.getApiTokenHeaders();

    const params: Record<string, string> = {
      fields:   'id,number,transDate,customer,salesman,totalAmount',
      pageSize: String(limit),
      page:     String(page),
    };
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;
    if (q)         params.keywords  = q;

    const response = await axios.get(`${host}/accurate/api/sales-return/list.do`, {
      params,
      headers,
      maxRedirects: 5,
    });

    if (!response.data || !response.data.s) {
      const errMsg = response.data?.d || response.data?.message || 'Response tidak valid dari Accurate';
      logger.error('Accurate API error (daftar-retur):', errMsg);
      return res.status(502).json({ message: `Accurate API error: ${errMsg}` });
    }

    const returns: any[] = response.data.d || [];
    const sp = response.data.sp || {};

    const rows = returns.map((ret) => ({
      id: ret.id,
      nomor: ret.number,
      id_pelanggan: ret.customer?.customerNo || '',
      nama_pelanggan: ret.customer?.name || '',
      id_karyawan_penjual_utama: ret.salesman?.salesNo || '',
      tanggal: ret.transDate,
      total: ret.totalAmount || 0,
      pembayaran_faktur_penjualan: ret.totalAmount || 0,
      nilai_retur_faktur: ret.totalAmount || 0,
    }));

    return res.status(200).json({
      data: rows,
      pagination: {
        page,
        limit:      sp.pageSize  || limit,
        total:      sp.rowCount  || rows.length,
        totalPages: sp.pageCount || 1,
      },
      source: 'accurate',
    });
  } catch (error: any) {
    const status = error.response?.status;
    const msg    = error.response?.data?.d || error.response?.data?.message || error.message;

    if (status === 401) {
      return res.status(401).json({
        message: `Sesi Accurate telah berakhir atau kredensial tidak valid${msg ? `: ${msg}` : ''}. Silakan hubungkan ulang di halaman Pengaturan.`,
        code: 'TOKEN_EXPIRED',
      });
    }

    logger.error('Gagal fetch daftar retur penjualan dari Accurate:', msg);
    return res.status(502).json({
      message: `Gagal mengambil data dari Accurate: ${msg || 'Kesalahan tidak diketahui'}`,
    });
  }
}
