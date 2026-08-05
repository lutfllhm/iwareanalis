import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import logger from '../services/logger';

// endDate query params arrive as "YYYY-MM-DD", which Date parses as UTC midnight.
// Without this, `lte: end` would exclude every transaction on the end date itself.
function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get Dashboard KPIs and Period Comparisons
 */
export async function getKPIs(req: AuthenticatedRequest, res: Response) {
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;

  if (!startDateStr || !endDateStr) {
    return res.status(400).json({ message: 'Tanggal mulai dan akhir wajib disertakan' });
  }

  try {
    const currStart = new Date(startDateStr);
    const currEnd = endOfDay(endDateStr);

    // Calculate previous period dates for comparison (same duration)
    const durationMs = currEnd.getTime() - currStart.getTime();
    const prevStart = new Date(currStart.getTime() - durationMs - 1000);
    const prevEnd = new Date(currStart.getTime() - 1000);

    // 1. Fetch Current Metrics
    const [
      invoices,
      returns,
      customersCount,
      skusCount
    ] = await Promise.all([
      prisma.fakturPenjualan.findMany({
        where: { tanggal: { gte: currStart, lte: currEnd } },
      }),
      prisma.returPenjualan.findMany({
        where: { tanggal: { gte: currStart, lte: currEnd } },
      }),
      prisma.fakturPenjualan.groupBy({
        by: ['id_pelanggan'],
        where: { tanggal: { gte: currStart, lte: currEnd } },
      }),
      prisma.rincianPenjualanBarang.groupBy({
        by: ['kode'],
        where: { tanggal: { gte: currStart, lte: currEnd } },
      }),
    ]);

    // 2. Fetch Previous Period Metrics
    const [
      prevInvoices,
      prevReturns
    ] = await Promise.all([
      prisma.fakturPenjualan.findMany({
        where: { tanggal: { gte: prevStart, lte: prevEnd } },
      }),
      prisma.returPenjualan.findMany({
        where: { tanggal: { gte: prevStart, lte: prevEnd } },
      }),
    ]);

    // Calculations - Current
    const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const invoiceCount = invoices.length;
    const aov = invoiceCount > 0 ? totalSales / invoiceCount : 0;
    const totalReturnAmt = returns.reduce((sum, ret) => sum + Number(ret.total), 0);
    const returnRate = totalSales > 0 ? (totalReturnAmt / totalSales) * 100 : 0;
    const activeCustomers = customersCount.length;
    const activeSkus = skusCount.length;

    // Calculations - Previous
    const prevTotalSales = prevInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const prevInvoiceCount = prevInvoices.length;
    const prevAov = prevInvoiceCount > 0 ? prevTotalSales / prevInvoiceCount : 0;
    const prevTotalReturnAmt = prevReturns.reduce((sum, ret) => sum + Number(ret.total), 0);
    const prevReturnRate = prevTotalSales > 0 ? (prevTotalReturnAmt / prevTotalSales) * 100 : 0;

    // Growth Metrics
    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return res.status(200).json({
      sales: { value: totalSales, growth: calcGrowth(totalSales, prevTotalSales) },
      invoices: { value: invoiceCount, growth: calcGrowth(invoiceCount, prevInvoiceCount) },
      aov: { value: aov, growth: calcGrowth(aov, prevAov) },
      returns: { value: totalReturnAmt, growth: calcGrowth(totalReturnAmt, prevTotalReturnAmt) },
      returnRate: { value: returnRate, growth: returnRate - prevReturnRate }, // absolute diff in percentage points
      activeCustomers: { value: activeCustomers },
      activeSkus: { value: activeSkus },
    });
  } catch (error) {
    logger.error('Failed to get KPIs:', error);
    return res.status(500).json({ message: 'Gagal memuat ringkasan KPI' });
  }
}

/**
 * Get Sales Trend Chart Data
 */
export async function getSalesTrend(req: AuthenticatedRequest, res: Response) {
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;

  if (!startDateStr || !endDateStr) {
    return res.status(400).json({ message: 'Tanggal mulai dan akhir wajib' });
  }

  try {
    const start = new Date(startDateStr);
    const end = endOfDay(endDateStr);

    const invoices = await prisma.fakturPenjualan.findMany({
      where: { tanggal: { gte: start, lte: end } },
      orderBy: { tanggal: 'asc' },
    });

    // Group sales by Date
    const trendMap = new Map<string, { tanggal: string; penjualan: number; invoices: number }>();
    
    invoices.forEach(inv => {
      const dateKey = inv.tanggal.toISOString().split('T')[0];
      const existing = trendMap.get(dateKey) || { tanggal: dateKey, penjualan: 0, invoices: 0 };
      existing.penjualan += Number(inv.total);
      existing.invoices += 1;
      trendMap.set(dateKey, existing);
    });

    const trendData = Array.from(trendMap.values());
    return res.status(200).json(trendData);
  } catch (error) {
    logger.error('Failed to get sales trend:', error);
    return res.status(500).json({ message: 'Gagal memuat tren penjualan' });
  }
}

/**
 * Get Top 10 Best Selling Products
 */
export async function getTopProducts(req: AuthenticatedRequest, res: Response) {
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;

  if (!startDateStr || !endDateStr) {
    return res.status(400).json({ message: 'Tanggal mulai dan akhir wajib' });
  }

  try {
    const start = new Date(startDateStr);
    const end = endOfDay(endDateStr);

    const rincian = await prisma.rincianPenjualanBarang.findMany({
      where: { tanggal: { gte: start, lte: end } },
    });

    // Group and aggregate
    const itemMap = new Map<string, { kode: string; nama: string; kuantitas: number; totalSales: number }>();

    rincian.forEach(line => {
      const existing = itemMap.get(line.kode) || { kode: line.kode, nama: line.nama_barang, kuantitas: 0, totalSales: 0 };
      existing.kuantitas += Number(line.kuantitas);
      existing.totalSales += Number(line.total_harga);
      itemMap.set(line.kode, existing);
    });

    // Sort descending by totalSales
    const sorted = Array.from(itemMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    return res.status(200).json(sorted);
  } catch (error) {
    logger.error('Failed to get top products:', error);
    return res.status(500).json({ message: 'Gagal memuat produk terlaris' });
  }
}

/**
 * Get Category Sales Ratios
 */
export async function getCategoryRatios(req: AuthenticatedRequest, res: Response) {
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;

  if (!startDateStr || !endDateStr) {
    return res.status(400).json({ message: 'Tanggal mulai dan akhir wajib' });
  }

  try {
    const start = new Date(startDateStr);
    const end = endOfDay(endDateStr);

    // Fetch lines along with item category mapping
    const rincian = await prisma.rincianPenjualanBarang.findMany({
      where: { tanggal: { gte: start, lte: end } },
      include: {
        barang: {
          select: { kategori_barang: true },
        },
      },
    });

    const categoryMap = new Map<string, { category: string; value: number }>();

    rincian.forEach(line => {
      const catName = line.barang?.kategori_barang || 'Umum';
      const existing = categoryMap.get(catName) || { category: catName, value: 0 };
      existing.value += Number(line.total_harga);
      categoryMap.set(catName, existing);
    });

    return res.status(200).json(Array.from(categoryMap.values()));
  } catch (error) {
    logger.error('Failed to get category ratios:', error);
    return res.status(500).json({ message: 'Gagal memuat kategori barang' });
  }
}

/**
 * Get Salesperson Performance leaderboard
 */
export async function getSalespersonPerformance(req: AuthenticatedRequest, res: Response) {
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;

  if (!startDateStr || !endDateStr) {
    return res.status(400).json({ message: 'Tanggal mulai dan akhir wajib' });
  }

  try {
    const start = new Date(startDateStr);
    const end = endOfDay(endDateStr);

    const rincian = await prisma.rincianPenjualanBarang.findMany({
      where: {
        tanggal: { gte: start, lte: end },
        nama_tenaga_penjual: { not: null },
      },
    });

    const salesMap = new Map<string, { name: string; sales: number; deals: number }>();

    rincian.forEach(line => {
      // Aman non-null: query di atas sudah filter nama_tenaga_penjual: { not: null }.
      const name = line.nama_tenaga_penjual as string;
      const existing = salesMap.get(name) || { name, sales: 0, deals: 0 };
      existing.sales += Number(line.total_harga);
      existing.deals += 1;
      salesMap.set(name, existing);
    });

    return res.status(200).json(Array.from(salesMap.values()).sort((a, b) => b.sales - a.sales));
  } catch (error) {
    logger.error('Failed to get salesperson performance:', error);
    return res.status(500).json({ message: 'Gagal memuat performa sales' });
  }
}

/**
 * Get Sales by Geolocation (Province/City)
 */
export async function getGeoSales(req: AuthenticatedRequest, res: Response) {
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;

  if (!startDateStr || !endDateStr) {
    return res.status(400).json({ message: 'Tanggal mulai dan akhir wajib' });
  }

  try {
    const start = new Date(startDateStr);
    const end = endOfDay(endDateStr);

    const invoices = await prisma.fakturPenjualan.findMany({
      where: { tanggal: { gte: start, lte: end } },
      include: {
        pelanggan: {
          select: { provinsi_pengiriman: true, kota_pengiriman: true },
        },
      },
    });

    const geoMap = new Map<string, { region: string; sales: number; count: number }>();

    invoices.forEach(inv => {
      const region = inv.pelanggan?.provinsi_pengiriman || 'Lainnya';
      const existing = geoMap.get(region) || { region, sales: 0, count: 0 };
      existing.sales += Number(inv.total);
      existing.count += 1;
      geoMap.set(region, existing);
    });

    return res.status(200).json(Array.from(geoMap.values()).sort((a, b) => b.sales - a.sales));
  } catch (error) {
    logger.error('Failed to get geo sales:', error);
    return res.status(500).json({ message: 'Gagal memuat sebaran geografi' });
  }
}

/**
 * Get RFM Customer Segmentation
 */
export async function getRFMData(_req: AuthenticatedRequest, res: Response) {
  try {
    const customers = await prisma.pelanggan.findMany({
      include: {
        faktur: {
          orderBy: { tanggal: 'desc' },
        },
      },
    });

    const rfmData = customers.map(cust => {
      const invoices = cust.faktur;
      const count = invoices.length;

      if (count === 0) {
        return {
          id: cust.id_pelanggan,
          nama: cust.nama,
          recencyDays: 999,
          frequency: 0,
          monetary: 0,
          segment: 'New/Lost',
        };
      }

      const lastDate = invoices[0].tanggal;
      const recencyDays = Math.ceil((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const frequency = count;
      const monetary = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);

      // Segment classification logic
      let segment = 'Potential Loyalist';
      if (recencyDays <= 30 && frequency >= 5 && monetary >= 50000000) {
        segment = 'Champions';
      } else if (recencyDays <= 60 && frequency >= 3) {
        segment = 'Loyal Customers';
      } else if (recencyDays > 60 && recencyDays <= 120 && frequency >= 2) {
        segment = 'At Risk';
      } else if (recencyDays > 120) {
        segment = 'Lost Customers';
      }

      return {
        id: cust.id_pelanggan,
        nama: cust.nama,
        recencyDays,
        frequency,
        monetary,
        segment,
      };
    });

    return res.status(200).json(rfmData);
  } catch (error) {
    logger.error('Failed to get RFM data:', error);
    return res.status(500).json({ message: 'Gagal memuat segmentasi RFM' });
  }
}

/**
 * Get Stock Mutation Summary (Ringkasan Mutasi Stok) with filter
 */
export async function getStockMutationSummary(req: AuthenticatedRequest, res: Response) {
  const { kodeBarang, namaGudang } = req.query;

  try {
    const rows = await prisma.ringkasanMutasiStok.findMany({
      where: {
        ...(kodeBarang ? { kode_barang: kodeBarang as string } : {}),
        ...(namaGudang ? { nama_gudang: { contains: namaGudang as string } } : {}),
      },
      orderBy: { tanggal_akhir: 'desc' },
    });

    return res.status(200).json(rows);
  } catch (error) {
    logger.error('Failed to get stock mutation summary:', error);
    return res.status(500).json({ message: 'Gagal memuat ringkasan mutasi stok' });
  }
}

/**
 * Get Serial Number Mutation list with filter
 */
export async function getSerialNumberMutation(req: AuthenticatedRequest, res: Response) {
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;
  const kodeBarang = req.query.kodeBarang as string | undefined;
  const serialNumber = req.query.serialNumber as string | undefined;

  try {
    const rows = await prisma.mutasiSerialNumber.findMany({
      where: {
        ...(startDateStr && endDateStr
          ? { tanggal: { gte: new Date(startDateStr), lte: endOfDay(endDateStr) } }
          : {}),
        ...(kodeBarang ? { kode_barang: kodeBarang } : {}),
        ...(serialNumber ? { serial_number: { contains: serialNumber } } : {}),
      },
      orderBy: { tanggal: 'desc' },
    });

    return res.status(200).json(rows);
  } catch (error) {
    logger.error('Failed to get serial number mutation:', error);
    return res.status(500).json({ message: 'Gagal memuat mutasi nomor seri' });
  }
}

/**
 * Get Work Order list with optional filter by status
 */
export async function getWorkOrders(req: AuthenticatedRequest, res: Response) {
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;
  const status = req.query.status as string | undefined;
  const kodeBarang = req.query.kodeBarang as string | undefined;

  try {
    const rows = await prisma.workOrder.findMany({
      where: {
        ...(startDateStr && endDateStr
          ? { tanggal: { gte: new Date(startDateStr), lte: endOfDay(endDateStr) } }
          : {}),
        ...(status ? { status } : {}),
        ...(kodeBarang ? { kode_barang_hasil: kodeBarang } : {}),
      },
      orderBy: { tanggal: 'desc' },
    });

    // Aggregate summary: target vs realisasi
    const totalTarget = rows.reduce((s, wo) => s + Number(wo.kuantitas_target), 0);
    const totalRealisasi = rows.reduce((s, wo) => s + Number(wo.kuantitas_realisasi), 0);
    const efisiensi = totalTarget > 0 ? (totalRealisasi / totalTarget) * 100 : 0;

    return res.status(200).json({
      summary: { totalTarget, totalRealisasi, efisiensi: Math.round(efisiensi * 100) / 100 },
      data: rows,
    });
  } catch (error) {
    logger.error('Failed to get work orders:', error);
    return res.status(500).json({ message: 'Gagal memuat data work order' });
  }
}

/**
 * Simple Forecasting (Moving Average)
 */
export async function getForecast(_req: AuthenticatedRequest, res: Response) {
  try {
    // Group invoices by Month/Year
    const invoices = await prisma.fakturPenjualan.findMany({
      orderBy: { tanggal: 'asc' },
    });

    const monthlySalesMap = new Map<string, { yearMonth: string; totalSales: number }>();
    
    invoices.forEach(inv => {
      const date = inv.tanggal;
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlySalesMap.get(yearMonth) || { yearMonth, totalSales: 0 };
      existing.totalSales += Number(inv.total);
      monthlySalesMap.set(yearMonth, existing);
    });

    const historical = Array.from(monthlySalesMap.values());

    if (historical.length < 3) {
      // Need at least 3 months for a 3-month moving average
      return res.status(200).json({
        message: 'Data historis tidak mencukupi untuk peramalan (min 3 bulan)',
        historical,
        forecast: [],
      });
    }

    // Calculate moving average for historical, and forecast next 3 periods
    const dataWithMA = historical.map((item, idx) => {
      if (idx < 2) return { ...item, movingAverage: null };
      const sum = historical.slice(idx - 2, idx + 1).reduce((s, h) => s + h.totalSales, 0);
      return { ...item, movingAverage: Math.round(sum / 3) };
    });

    // Forecast next 3 months
    const forecast = [];
    let lastThree = historical.slice(-3).map(h => h.totalSales);
    const lastMonthStr = historical[historical.length - 1].yearMonth;
    const parts = lastMonthStr.split('-');
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);

    for (let f = 1; f <= 3; f++) {
      // Calculate average of the last 3 elements
      const avg = lastThree.reduce((s, val) => s + val, 0) / 3;
      
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
      const forecastMonthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      forecast.push({
        yearMonth: forecastMonthStr,
        forecastSales: Math.round(avg),
      });

      // Shift window for next iteration
      lastThree.shift();
      lastThree.push(avg);
    }

    return res.status(200).json({
      historical: dataWithMA,
      forecast,
    });
  } catch (error) {
    logger.error('Failed to generate sales forecast:', error);
    return res.status(500).json({ message: 'Gagal membuat peramalan penjualan' });
  }
}
