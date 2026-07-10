'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import ChartTooltip from '@/components/charts/ChartTooltip';
import { ChartCard, ChartLoadingState, ChartEmptyState } from '@/components/charts/ChartCard';
import { useTheme } from '@/components/ThemeProvider';
import { useMounted } from '@/hooks/useMounted';
import api from '@/lib/api';
import { categoricalColor, formatRupiah, formatCompactRupiah } from '@/lib/chart-theme';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import { Calendar, Printer, TrendingUp, PackageSearch, PieChart as PieChartIcon, MapPin, Users2, LineChart as LineChartIcon } from 'lucide-react';

interface ForecastPoint {
  yearMonth: string;
  totalSales?: number;
  movingAverage?: number;
  forecastSales?: number;
}

interface CategoryRatio {
  category: string;
  value: number;
}

interface RfmRow {
  id: string | number;
  nama: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  segment: string;
}

export default function LaporanPage() {
  const mounted = useMounted();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch Sales Trend
  const { data: trendData, isLoading: isTrendLoading } = useQuery({
    queryKey: ['salesTrend', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/sales-trend', { params: { startDate, endDate } });
      return res.data;
    },
  });

  // Fetch Top Products
  const { data: topProducts, isLoading: isProductsLoading } = useQuery({
    queryKey: ['topProducts', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/top-products', { params: { startDate, endDate } });
      return res.data;
    },
  });

  // Fetch Categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categoryRatios', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/category-ratios', { params: { startDate, endDate } });
      return res.data;
    },
  });

  // Fetch Sales Performance
  const { data: salesperson, isLoading: isSalespersonLoading } = useQuery({
    queryKey: ['salespersonPerformance', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/sales-performance', { params: { startDate, endDate } });
      return res.data;
    },
  });

  // Fetch Geo Sales
  const { data: geoSales, isLoading: isGeoLoading } = useQuery({
    queryKey: ['geoSales', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/geo-sales', { params: { startDate, endDate } });
      return res.data;
    },
  });

  // Fetch RFM Segments
  const { data: rfmData } = useQuery({
    queryKey: ['rfmData'],
    queryFn: async () => {
      const res = await api.get('/analytics/rfm');
      return res.data;
    },
  });

  // Fetch Forecasting data
  const { data: forecastData, isLoading: isForecastLoading } = useQuery({
    queryKey: ['forecastData'],
    queryFn: async () => {
      const res = await api.get('/analytics/forecast');
      return res.data;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  // Compile full forecasting chart dataset
  const combinedForecastChartData = () => {
    if (!forecastData) return [];
    const hist = (forecastData.historical || []).map((h: ForecastPoint) => ({
      name: h.yearMonth,
      Historis: h.totalSales,
      RataRataBergerak: h.movingAverage,
      Prediksi: null
    }));

    const fore = (forecastData.forecast || []).map((f: ForecastPoint) => ({
      name: f.yearMonth,
      Historis: null,
      RataRataBergerak: null,
      Prediksi: f.forecastSales
    }));

    // Connect lines visually by repeating the last hist value as the first prediction
    if (hist.length > 0 && fore.length > 0) {
      fore[0].Historis = hist[hist.length - 1].Historis;
      fore[0].Prediksi = hist[hist.length - 1].Historis;
    }

    return [...hist, ...fore];
  };

  const getSegmentBadge = (seg: string) => {
    switch (seg) {
      case 'Champions':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'Loyal Customers':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'Potential Loyalist':
        return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20';
      case 'At Risk':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      default:
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    }
  };

  const axisColor = isDark ? '#c3c2b7' : '#898781';
  const gridColor = isDark ? '#2c2c2a' : '#e1e0d9';
  const trendColor = categoricalColor(0, isDark);
  const geoColor = categoricalColor(1, isDark);
  const salespersonColor = categoricalColor(6, isDark);
  const historisColor = categoricalColor(0, isDark);
  const movingAvgColor = categoricalColor(1, isDark);
  const prediksiColor = categoricalColor(2, isDark);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      {/* Report page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Laporan Data Analyst</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visualisasi tren penjualan, performa tim marketing, sebaran wilayah, dan peramalan pasar
          </p>
        </div>

        {/* Filters and export settings */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-card border border-border rounded-xl px-3 py-2">
            <Calendar className="text-muted-foreground" size={16} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none w-28 font-semibold"
            />
            <span className="text-muted-foreground text-xs font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none w-28 font-semibold"
            />
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted font-bold text-sm transition-all duration-150"
          >
            <Printer size={15} />
            <span>Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-5 mb-8">
        <h1 className="text-3xl font-black">LAPORAN DATA ANALYST PENJUALAN</h1>
        <p className="text-sm text-slate-500 mt-2">
          Periode Analisis: {new Date(startDate).toLocaleDateString('id-ID')} s/d {new Date(endDate).toLocaleDateString('id-ID')}
        </p>
      </div>

      {/* 1. VISUALIZATION GRID: RECHARTS WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CHART 1: REVENUE TREND (AREA) */}
        <ChartCard
          title="Tren Pendapatan Penjualan"
          badge={<span className="text-[10px] text-muted-foreground font-semibold">Harian</span>}
        >
          {isTrendLoading ? (
            <ChartLoadingState message="Memuat data tren..." />
          ) : !trendData || trendData.length === 0 ? (
            <ChartEmptyState icon={TrendingUp} message="Belum ada data tren penjualan pada periode ini" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="tanggal" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompactRupiah} width={56} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => formatRupiah(Number(v))} />}
                  cursor={{ stroke: gridColor, strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="penjualan" name="Penjualan" stroke={trendColor} strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* CHART 2: TOP 10 BEST SELLING PRODUCTS (BAR) */}
        <ChartCard title="Top 10 Produk Terlaris (Revenue)">
          {isProductsLoading ? (
            <ChartLoadingState message="Memuat produk terlaris..." />
          ) : !topProducts || topProducts.length === 0 ? (
            <ChartEmptyState icon={PackageSearch} message="Belum ada data penjualan produk pada periode ini" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompactRupiah} />
                <YAxis dataKey="nama" type="category" stroke={axisColor} fontSize={9} tickLine={false} axisLine={false} width={92} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => formatRupiah(Number(v))} />}
                  cursor={{ fill: gridColor, opacity: 0.3 }}
                />
                <Bar dataKey="totalSales" name="Total Pendapatan" fill={categoricalColor(0, isDark)} radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* CHART 3: CATEGORY SALES SHARES (PIE / DONUT) */}
        <ChartCard title="Distribusi Kontribusi Kategori">
          {isCategoriesLoading ? (
            <ChartLoadingState message="Memuat distribusi kategori..." />
          ) : !categories || categories.length === 0 ? (
            <ChartEmptyState icon={PieChartIcon} message="Tidak ada rincian kategori pada periode terpilih" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="45%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="category"
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {categories.map((entry: CategoryRatio, index: number) => (
                    <Cell key={`cell-${index}`} fill={categoricalColor(index, isDark)} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => formatRupiah(Number(v))} />} />
                <Legend
                  verticalAlign="bottom"
                  height={48}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* CHART 4: GEOGRAPHICAL SELLAR RANKING (BAR) */}
        <ChartCard title="Sebaran Wilayah Pengiriman (Revenue)">
          {isGeoLoading ? (
            <ChartLoadingState message="Memuat sebaran wilayah..." />
          ) : !geoSales || geoSales.length === 0 ? (
            <ChartEmptyState icon={MapPin} message="Belum ada sebaran wilayah penjualan" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geoSales} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="region" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompactRupiah} width={56} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => formatRupiah(Number(v))} />}
                  cursor={{ fill: gridColor, opacity: 0.3 }}
                />
                <Bar dataKey="sales" name="Penjualan" fill={geoColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* CHART 5: SALESPERSON ATTRIBUTION (BAR) */}
        <ChartCard title="Performa Marketing Leaderboard">
          {isSalespersonLoading ? (
            <ChartLoadingState message="Memuat performa marketing..." />
          ) : !salesperson || salesperson.length === 0 ? (
            <ChartEmptyState icon={Users2} message="Belum ada aktivitas marketing sales" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesperson} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompactRupiah} />
                <YAxis dataKey="name" type="category" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} width={82} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => formatRupiah(Number(v))} />}
                  cursor={{ fill: gridColor, opacity: 0.3 }}
                />
                <Bar dataKey="sales" name="Penjualan" fill={salespersonColor} radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* CHART 6: FORECASTING AND 3-PERIOD MOVING AVERAGE (LINE) */}
        <ChartCard
          title="Peramalan Tren Penjualan"
          badge={
            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 whitespace-nowrap">
              3-Period Moving Average
            </span>
          }
        >
          {isForecastLoading ? (
            <ChartLoadingState message="Menghitung model perkiraan..." />
          ) : !forecastData ? (
            <ChartEmptyState icon={LineChartIcon} message="Data historis belum mencukupi untuk peramalan" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedForecastChartData()} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompactRupiah} width={56} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatRupiah(Number(v))} />} />
                <Line type="monotone" dataKey="Historis" stroke={historisColor} strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="RataRataBergerak" stroke={movingAvgColor} strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                <Line type="monotone" dataKey="Prediksi" stroke={prediksiColor} strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 6 }} connectNulls />
                <Legend verticalAlign="bottom" height={36} iconType="line" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>

      {/* 2. CUSTOMER RFM SEGMENTATION TABLE */}
      <div className="card-elevated bg-card border border-border/60 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Segmentasi Pelanggan (Analisis RFM)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Klasifikasi pelanggan menggunakan Recency (Kekinian), Frequency (Frekuensi), dan Monetary (Moneter)</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-3 font-bold text-muted-foreground text-xs uppercase">ID Pelanggan</th>
                <th className="p-3 font-bold text-muted-foreground text-xs uppercase">Nama Pelanggan</th>
                <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-center">Recency (Hari)</th>
                <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-center">Frequency (Transaksi)</th>
                <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-right">Monetary (Kontribusi)</th>
                <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-center">Segmentasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rfmData && rfmData.length > 0 ? (
                rfmData.slice(0, 10).map((row: RfmRow) => (
                  <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-bold text-foreground">{row.id}</td>
                    <td className="p-3 text-foreground">{row.nama}</td>
                    <td className="p-3 text-center text-foreground font-semibold">{row.recencyDays} hari lalu</td>
                    <td className="p-3 text-center text-foreground font-semibold">{row.frequency}x</td>
                    <td className="p-3 text-right text-foreground font-semibold">{formatRupiah(row.monetary)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${getSegmentBadge(row.segment)}`}>
                        {row.segment}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">Menghitung matriks RFM...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
