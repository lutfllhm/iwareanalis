import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import logger from '../services/logger';

/**
 * Helper: Convert array of objects to SQL INSERT statements for a given table
 */
function toSQLInsert(tableName: string, rows: Record<string, any>[]): string {
  if (rows.length === 0) return `-- Tidak ada data pada tabel ${tableName}\n`;

  const columns = Object.keys(rows[0]);
  const escapeValue = (v: any): string => {
    if (v == null) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
    if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber().toString(); // Prisma Decimal
    return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
  };

  const lines = [
    `-- Export tabel ${tableName} (${rows.length} baris) — ${new Date().toISOString()}`,
    '',
  ];
  for (const row of rows) {
    const values = columns.map((c) => escapeValue(row[c])).join(', ');
    lines.push(`INSERT INTO \`${tableName}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${values});`);
  }
  return lines.join('\n') + '\n';
}

/**
 * Helper: Check if download is allowed for a module via settings
 */
async function isDownloadAllowed(moduleName: string): Promise<boolean> {
  try {
    const setting = await prisma.setting.findFirst({ where: { key: 'DOWNLOAD_ENABLED_MODULES' } });
    if (!setting || !setting.value) return true; // default allow if not set
    const allowed: string[] = JSON.parse(setting.value);
    return allowed.includes(moduleName);
  } catch {
    return true;
  }
}

/**
 * Get Goods and Services list
 */
export async function getBarangJasa(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '10', 10);
  const q = req.query.q as string || '';
  const kategori = req.query.kategori as string || '';
  const nonAktif = req.query.nonAktif as string || '';
  const sortBy = req.query.sortBy as string || 'kode_barang';
  const sortOrder = (req.query.sortOrder as string || 'asc') as 'asc' | 'desc';

  const skip = (page - 1) * limit;

  try {
    const where: any = {};

    if (kategori) {
      where.kategori_barang = kategori;
    }

    if (nonAktif) {
      where.non_aktif = nonAktif === 'true';
    }

    if (q) {
      where.OR = [
        { kode_barang: { contains: q } },
        { nama_barang: { contains: q } },
        { kategori_barang: { contains: q } },
        { nama_merek_barang: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.barangJasa.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.barangJasa.count({ where }),
    ]);

    // Get unique categories list for filtering options
    const categories = await prisma.barangJasa.groupBy({
      by: ['kategori_barang'],
    });

    return res.status(200).json({
      data: items,
      categories: categories.map(c => c.kategori_barang),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Failed to get barang_jasa:', error);
    return res.status(500).json({ message: 'Gagal mengambil data barang dan jasa' });
  }
}

/**
 * Get Customers list
 */
export async function getPelanggan(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '10', 10);
  const q = req.query.q as string || '';
  const provinsi = req.query.provinsi as string || '';
  const nonAktif = req.query.nonAktif as string || '';
  const sortBy = req.query.sortBy as string || 'id_pelanggan';
  const sortOrder = (req.query.sortOrder as string || 'asc') as 'asc' | 'desc';

  const skip = (page - 1) * limit;

  try {
    const where: any = {};

    if (provinsi) {
      where.provinsi_pengiriman = provinsi;
    }

    if (nonAktif) {
      where.non_aktif = nonAktif === 'true';
    }

    if (q) {
      where.OR = [
        { id_pelanggan: { contains: q } },
        { nama: { contains: q } },
        { kota_pengiriman: { contains: q } },
        { provinsi_pengiriman: { contains: q } },
        { nama_default_penjual: { contains: q } },
      ];
    }

    const [custs, total] = await Promise.all([
      prisma.pelanggan.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.pelanggan.count({ where }),
    ]);

    const provinces = await prisma.pelanggan.groupBy({
      by: ['provinsi_pengiriman'],
      where: { provinsi_pengiriman: { not: null } },
    });

    return res.status(200).json({
      data: custs,
      provinces: provinces.map(p => p.provinsi_pengiriman).filter(Boolean),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Failed to get pelanggan:', error);
    return res.status(500).json({ message: 'Gagal mengambil data pelanggan' });
  }
}

/**
 * Get Sales Invoices list
 */
export async function getFakturPenjualan(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '10', 10);
  const q = req.query.q as string || '';
  const customerId = req.query.customerId as string || '';
  const startDate = req.query.startDate as string || '';
  const endDate = req.query.endDate as string || '';
  const sortBy = req.query.sortBy as string || 'tanggal';
  const sortOrder = (req.query.sortOrder as string || 'desc') as 'asc' | 'desc';

  const skip = (page - 1) * limit;

  try {
    const where: any = {};

    if (customerId) {
      where.id_pelanggan = customerId;
    }

    if (startDate && endDate) {
      where.tanggal = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (q) {
      where.OR = [
        { nomor: { contains: q } },
        { id_pelanggan: { contains: q } },
        { id_karyawan_penjual_utama: { contains: q } },
        { pelanggan: { nama: { contains: q } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.fakturPenjualan.findMany({
        where,
        include: {
          pelanggan: {
            select: { nama: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.fakturPenjualan.count({ where }),
    ]);

    const formatted = invoices.map(inv => ({
      id: inv.id,
      nomor: inv.nomor,
      id_pelanggan: inv.id_pelanggan,
      nama_pelanggan: inv.pelanggan.nama,
      id_karyawan_penjual_utama: inv.id_karyawan_penjual_utama,
      tanggal: inv.tanggal,
      total: inv.total,
      pembayaran: inv.pembayaran,
      synced_at: inv.synced_at,
    }));

    return res.status(200).json({
      data: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Failed to get invoices:', error);
    return res.status(500).json({ message: 'Gagal mengambil data faktur penjualan' });
  }
}

/**
 * Get Sales Invoice details
 */
export async function getRincianPenjualan(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '10', 10);
  const q = req.query.q as string || '';
  const itemCode = req.query.itemCode as string || '';
  const salesmanId = req.query.salesmanId as string || '';
  const startDate = req.query.startDate as string || '';
  const endDate = req.query.endDate as string || '';
  const sortBy = req.query.sortBy as string || 'tanggal';
  const sortOrder = (req.query.sortOrder as string || 'desc') as 'asc' | 'desc';

  const skip = (page - 1) * limit;

  try {
    const where: any = {};

    if (itemCode) {
      where.kode = itemCode;
    }

    if (salesmanId) {
      where.id_karyawan_tenaga_penjual = salesmanId;
    }

    if (startDate && endDate) {
      where.tanggal = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (q) {
      where.OR = [
        { nomor: { contains: q } },
        { kode: { contains: q } },
        { nama_barang: { contains: q } },
        { nama_pelanggan: { contains: q } },
        { nama_tenaga_penjual: { contains: q } },
      ];
    }

    const [details, total] = await Promise.all([
      prisma.rincianPenjualanBarang.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.rincianPenjualanBarang.count({ where }),
    ]);

    return res.status(200).json({
      data: details,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Failed to get rincian_penjualan:', error);
    return res.status(500).json({ message: 'Gagal mengambil data rincian penjualan' });
  }
}

/**
 * Get Sales Returns list
 */
export async function getReturPenjualan(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '10', 10);
  const q = req.query.q as string || '';
  const startDate = req.query.startDate as string || '';
  const endDate = req.query.endDate as string || '';
  const sortBy = req.query.sortBy as string || 'tanggal';
  const sortOrder = (req.query.sortOrder as string || 'desc') as 'asc' | 'desc';

  const skip = (page - 1) * limit;

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
        { nomor: { contains: q } },
        { id_pelanggan: { contains: q } },
        { id_karyawan_penjual_utama: { contains: q } },
        { pelanggan: { nama: { contains: q } } },
      ];
    }

    const [returns, total] = await Promise.all([
      prisma.returPenjualan.findMany({
        where,
        include: {
          pelanggan: {
            select: { nama: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.returPenjualan.count({ where }),
    ]);

    const formatted = returns.map(ret => ({
      id: ret.id,
      nomor: ret.nomor,
      id_pelanggan: ret.id_pelanggan,
      nama_pelanggan: ret.pelanggan.nama,
      id_karyawan_penjual_utama: ret.id_karyawan_penjual_utama,
      tanggal: ret.tanggal,
      total: ret.total,
      pembayaran_faktur_penjualan: ret.pembayaran_faktur_penjualan,
      nilai_retur_faktur: ret.nilai_retur_faktur,
      synced_at: ret.synced_at,
    }));

    return res.status(200).json({
      data: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Failed to get returns:', error);
    return res.status(500).json({ message: 'Gagal mengambil data retur penjualan' });
  }
}

// ============================================================
// DOWNLOAD (Full Export) Endpoints
// ============================================================

/**
 * Download all Barang & Jasa as SQL
 */
export async function downloadBarangJasa(_req: AuthenticatedRequest, res: Response) {
  if (!(await isDownloadAllowed('barang-jasa'))) {
    return res.status(403).json({ message: 'Download untuk modul Barang & Jasa tidak diaktifkan' });
  }
  try {
    const rows = await prisma.barangJasa.findMany({ orderBy: { kode_barang: 'asc' } });
    const sql = toSQLInsert('barang_jasa', rows as any[]);
    const filename = `barang_jasa_${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(sql);
  } catch (error) {
    logger.error('Failed to download barang_jasa:', error);
    return res.status(500).json({ message: 'Gagal mengunduh data barang dan jasa' });
  }
}

/**
 * Download all Pelanggan as SQL
 */
export async function downloadPelanggan(_req: AuthenticatedRequest, res: Response) {
  if (!(await isDownloadAllowed('pelanggan'))) {
    return res.status(403).json({ message: 'Download untuk modul Pelanggan tidak diaktifkan' });
  }
  try {
    const rows = await prisma.pelanggan.findMany({ orderBy: { id_pelanggan: 'asc' } });
    const sql = toSQLInsert('pelanggan', rows as any[]);
    const filename = `pelanggan_${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(sql);
  } catch (error) {
    logger.error('Failed to download pelanggan:', error);
    return res.status(500).json({ message: 'Gagal mengunduh data pelanggan' });
  }
}

/**
 * Helper: Build a Prisma "tanggal" range filter from optional startDate/endDate
 * query params (format "YYYY-MM-DD"). endDate is inclusive through end-of-day.
 */
function dateRangeFilter(req: AuthenticatedRequest): { gte?: Date; lte?: Date } | undefined {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  if (!startDate && !endDate) return undefined;

  const range: { gte?: Date; lte?: Date } = {};
  if (startDate) range.gte = new Date(`${startDate}T00:00:00`);
  if (endDate) range.lte = new Date(`${endDate}T23:59:59.999`);
  return range;
}

/**
 * Download all Faktur Penjualan as SQL
 */
export async function downloadFakturPenjualan(req: AuthenticatedRequest, res: Response) {
  if (!(await isDownloadAllowed('faktur-penjualan'))) {
    return res.status(403).json({ message: 'Download untuk modul Faktur Penjualan tidak diaktifkan' });
  }
  try {
    const tanggal = dateRangeFilter(req);
    const rows = await prisma.fakturPenjualan.findMany({
      where: tanggal ? { tanggal } : undefined,
      include: { pelanggan: { select: { nama: true } } },
      orderBy: { tanggal: 'desc' },
    });
    const flat = rows.map((r) => ({
      id: r.id,
      nomor: r.nomor,
      id_pelanggan: r.id_pelanggan,
      nama_pelanggan: r.pelanggan.nama,
      id_karyawan_penjual_utama: r.id_karyawan_penjual_utama,
      tanggal: r.tanggal,
      total: r.total,
      pembayaran: r.pembayaran,
      synced_at: r.synced_at,
    }));
    const sql = toSQLInsert('faktur_penjualan', flat);
    const filename = `faktur_penjualan_${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(sql);
  } catch (error) {
    logger.error('Failed to download faktur_penjualan:', error);
    return res.status(500).json({ message: 'Gagal mengunduh data faktur penjualan' });
  }
}

/**
 * Download all Rincian Penjualan as SQL
 */
export async function downloadRincianPenjualan(req: AuthenticatedRequest, res: Response) {
  if (!(await isDownloadAllowed('rincian-penjualan'))) {
    return res.status(403).json({ message: 'Download untuk modul Rincian Penjualan tidak diaktifkan' });
  }
  try {
    const tanggal = dateRangeFilter(req);
    const rows = await prisma.rincianPenjualanBarang.findMany({
      where: tanggal ? { tanggal } : undefined,
      orderBy: { tanggal: 'desc' },
    });
    const sql = toSQLInsert('rincian_penjualan_barang', rows as any[]);
    const filename = `rincian_penjualan_${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(sql);
  } catch (error) {
    logger.error('Failed to download rincian_penjualan:', error);
    return res.status(500).json({ message: 'Gagal mengunduh data rincian penjualan' });
  }
}

/**
 * Download all Retur Penjualan as SQL
 */
export async function downloadReturPenjualan(req: AuthenticatedRequest, res: Response) {
  if (!(await isDownloadAllowed('retur-penjualan'))) {
    return res.status(403).json({ message: 'Download untuk modul Retur Penjualan tidak diaktifkan' });
  }
  try {
    const tanggal = dateRangeFilter(req);
    const rows = await prisma.returPenjualan.findMany({
      where: tanggal ? { tanggal } : undefined,
      include: { pelanggan: { select: { nama: true } } },
      orderBy: { tanggal: 'desc' },
    });
    const flat = rows.map((r) => ({
      id: r.id,
      nomor: r.nomor,
      id_pelanggan: r.id_pelanggan,
      nama_pelanggan: r.pelanggan.nama,
      id_karyawan_penjual_utama: r.id_karyawan_penjual_utama,
      tanggal: r.tanggal,
      total: r.total,
      pembayaran_faktur_penjualan: r.pembayaran_faktur_penjualan,
      nilai_retur_faktur: r.nilai_retur_faktur,
      synced_at: r.synced_at,
    }));
    const sql = toSQLInsert('retur_penjualan', flat);
    const filename = `retur_penjualan_${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(sql);
  } catch (error) {
    logger.error('Failed to download retur_penjualan:', error);
    return res.status(500).json({ message: 'Gagal mengunduh data retur penjualan' });
  }
}

