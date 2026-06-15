'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import { Calendar, Download, Printer, ArrowUpRight, ShieldAlert } from 'lucide-react';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#e11d48', '#10b981', '#f59e0b'];

export default function LaporanPage() {
  const [mounted, setMounted] = useState(false);
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Drilldown states
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch KPI dashboard data
  const { data: kpis } = useQuery({
    queryKey: ['reportKpis', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/kpis', { params: { startDate, endDate } });
      return res.data;
    },
  });

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
  const { data: categories } = useQuery({
    queryKey: ['categoryRatios', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/category-ratios', { params: { startDate, endDate } });
      return res.data;
    },
  });

  // Fetch Sales Performance
  const { data: salesperson } = useQuery({
    queryKey: ['salespersonPerformance', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/sales-performance', { params: { startDate, endDate } });
      return res.data;
    },
  });

  // Fetch Geo Sales
  const { data: geoSales } = useQuery({
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
  const { data: forecastData } = useQuery({
    queryKey: ['forecastData'],
    queryFn: async () => {
      const res = await api.get('/analytics/forecast');
      return res.data;
    },
  });

  // Format currency helper
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  // Compile full forecasting chart dataset
  const combinedForecastChartData = () => {
    if (!forecastData) return [];
    const hist = (forecastData.historical || []).map((h: any) => ({
      name: h.yearMonth,
      Historis: h.totalSales,
      RataRataBergerak: h.movingAverage,
      Prediksi: null
    }));
    
    const fore = (forecastData.forecast || []).map((f: any, idx: number) => ({
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
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Tren Pendapatan Penjualan</h3>
            <span className="text-[10px] text-muted-foreground font-semibold">Harian</span>
          </div>
          <div className="h-72 w-full">
            {isTrendLoading ? (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">Memuat data tren...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="tanggal" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(val) => `${val/1000000}M`} />
                  <Tooltip formatter={(value) => [formatRupiah(Number(value)), 'Penjualan']} />
                  <Area type="monotone" dataKey="penjualan" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 2: TOP 10 BEST SELLING PRODUCTS (BAR) */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-4">Top 10 Produk Terlaris (Revenue)</h3>
          <div className="h-72 w-full">
            {isProductsLoading ? (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">Memuat produk terlaris...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(val) => `${val/1000000}jt`} />
                  <YAxis dataKey="nama" type="category" stroke="var(--color-muted-foreground)" fontSize={9} width={90} />
                  <Tooltip formatter={(value) => [formatRupiah(Number(value)), 'Total Pendapatan']} />
                  <Bar dataKey="totalSales" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {(topProducts || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 3: CATEGORY SALES SHARES (PIE / DONUT) */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm relative">
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-4">Distribusi Kontribusi Kategori</h3>
          <div className="h-72 w-full flex items-center justify-center">
            {categories && categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="category"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {categories.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatRupiah(Number(val))} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" fontSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">Tidak ada rincian kategori pada periode terpilih</p>
            )}
          </div>
        </div>

        {/* CHART 4: GEOGRAPHICAL SELLAR RANKING (BAR) */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-4">Sebaran Wilayah Pengiriman (Revenue)</h3>
          <div className="h-72 w-full">
            {geoSales && geoSales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={geoSales || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="region" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(val) => `${val/1000000}M`} />
                  <Tooltip formatter={(val) => formatRupiah(Number(val))} />
                  <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center justify-center h-full">Belum ada sebaran wilayah penjualan</p>
            )}
          </div>
        </div>

        {/* CHART 5: SALESPERSON ATTRIBUTION (BAR) */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-4">Performa Marketing Leaderboard</h3>
          <div className="h-72 w-full">
            {salesperson && salesperson.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesperson || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(val) => `${val/1000000}jt`} />
                  <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={10} width={80} />
                  <Tooltip formatter={(val) => formatRupiah(Number(val))} />
                  <Bar dataKey="sales" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center justify-center h-full">Belum ada aktivitas marketing sales</p>
            )}
          </div>
        </div>

        {/* CHART 6: FORECASTING AND 3-PERIOD MOVING AVERAGE (LINE) */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Peramalan Tren Penjualan</h3>
            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">3-Period Moving Average</span>
          </div>
          <div className="h-72 w-full">
            {forecastData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedForecastChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(val) => `${val/1000000}M`} />
                  <Tooltip formatter={(val) => formatRupiah(Number(val))} />
                  <Line type="monotone" dataKey="Historis" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="RataRataBergerak" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="Prediksi" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="line" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">Menghitung model perkiraan...</div>
            )}
          </div>
        </div>

      </div>

      {/* 2. CUSTOMER RFM SEGMENTATION TABLE */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Segmentasi Pelanggan (Analisis RFM)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Klasifikasi pelanggan menggunakan Recency (Kekinian), Frequency (Kerapuhan), dan Monetary (Moneter)</p>
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
                rfmData.slice(0, 10).map((row: any) => (
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
