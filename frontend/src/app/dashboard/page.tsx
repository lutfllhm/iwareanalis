'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ChartTooltip from '@/components/charts/ChartTooltip';
import { ChartCard, ChartLoadingState, ChartEmptyState } from '@/components/charts/ChartCard';
import { useTheme } from '@/components/ThemeProvider';
import api from '@/lib/api';
import { categoricalColor, formatRupiah as formatRupiahChart, formatCompactRupiah } from '@/lib/chart-theme';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import {
  TrendingUp,
  FileText,
  DollarSign,
  Undo2,
  Users,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertCircle,
  PackageSearch,
  ArrowRight
} from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  growth?: number;
  icon: React.ComponentType<any>;
  color: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
}

function KPICard({ title, value, growth, icon: Icon, color, isCurrency, isPercentage }: KPICardProps) {
  const formatVal = (val: string | number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(Number(val));
    }
    if (isPercentage) {
      return `${Number(val).toFixed(2)}%`;
    }
    return Number(val).toLocaleString('id-ID');
  };

  const isGrowthPositive = growth !== undefined && growth >= 0;

  return (
    <div className="card-elevated bg-card border border-border/60 hover:border-border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group">
      {/* Background soft glow on hover */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 dark:opacity-10 group-hover:scale-150 transition-transform duration-500 bg-${color}`} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl bg-secondary text-foreground`}>
          <Icon size={20} className={`text-${color}`} />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="glow-text text-2xl font-black text-foreground tracking-tight">
          {formatVal(value)}
        </h3>
        {growth !== undefined && (
          <div className="flex items-center space-x-1 mt-2">
            {isGrowthPositive ? (
              <span className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                <ArrowUpRight size={14} className="mr-0.5" />
                {growth.toFixed(1)}%
              </span>
            ) : (
              <span className="flex items-center text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg">
                <ArrowDownRight size={14} className="mr-0.5" />
                {Math.abs(growth).toFixed(1)}%
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-semibold">vs periode sebelumnya</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Query KPIs data
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ['kpis', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/kpis', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  });

  // Query ringkasan tren penjualan untuk mini chart
  const { data: trendData, isLoading: isTrendLoading } = useQuery({
    queryKey: ['dashboardSalesTrend', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/sales-trend', { params: { startDate, endDate } });
      return res.data;
    },
  });

  // Query top 5 produk terlaris untuk mini chart
  const { data: topProducts, isLoading: isProductsLoading } = useQuery({
    queryKey: ['dashboardTopProducts', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/analytics/top-products', { params: { startDate, endDate, limit: 5 } });
      return res.data;
    },
  });

  const axisColor = isDark ? '#c3c2b7' : '#898781';
  const gridColor = isDark ? '#2c2c2a' : '#e1e0d9';
  const trendColor = categoricalColor(0, isDark);

  return (
    <DashboardLayout>
      {/* Welcome header & Date Range filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Dashboard Ringkasan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ringkasan data analitik penjualan, performa, dan piutang pelanggan
          </p>
        </div>

        {/* Date Filter selector */}
        <div className="flex items-center space-x-3.5 bg-card border border-border rounded-xl px-3.5 py-2">
          <Calendar className="text-muted-foreground flex-shrink-0" size={16} />
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
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center space-x-3 text-sm">
          <AlertCircle size={20} />
          <span>Gagal mengambil ringkasan KPI data: {error.message}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Total Penjualan"
          value={isLoading ? 0 : kpis?.sales?.value || 0}
          growth={kpis?.sales?.growth}
          icon={DollarSign}
          color="blue-500"
          isCurrency
        />
        <KPICard
          title="Volume Faktur"
          value={isLoading ? 0 : kpis?.invoices?.value || 0}
          growth={kpis?.invoices?.growth}
          icon={FileText}
          color="indigo-500"
        />
        <KPICard
          title="Rata-rata Transaksi (AOV)"
          value={isLoading ? 0 : kpis?.aov?.value || 0}
          growth={kpis?.aov?.growth}
          icon={TrendingUp}
          color="violet-500"
          isCurrency
        />
        <KPICard
          title="Total Retur Penjualan"
          value={isLoading ? 0 : kpis?.returns?.value || 0}
          growth={kpis?.returns?.growth}
          icon={Undo2}
          color="rose-500"
          isCurrency
        />
      </div>

      {/* Secondary Metrics Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card-elevated bg-card border border-border/60 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-secondary rounded-xl text-primary">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pelanggan Aktif</span>
            <h4 className="text-xl font-extrabold text-foreground mt-0.5">
              {isLoading ? '...' : kpis?.activeCustomers?.value || 0}
            </h4>
          </div>
        </div>

        <div className="card-elevated bg-card border border-border/60 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-secondary rounded-xl text-indigo-500">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU Terjual</span>
            <h4 className="text-xl font-extrabold text-foreground mt-0.5">
              {isLoading ? '...' : kpis?.activeSkus?.value || 0}
            </h4>
          </div>
        </div>

        <div className="card-elevated bg-card border border-border/60 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-secondary rounded-xl text-rose-500">
            <Undo2 size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rasio Nilai Retur</span>
            <h4 className="text-xl font-extrabold text-foreground mt-0.5">
              {isLoading ? '...' : `${(kpis?.returnRate?.value || 0).toFixed(2)}%`}
            </h4>
          </div>
        </div>
      </div>

      {/* Ringkasan Visual: mini charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Tren Penjualan" subtitle="30 hari terakhir" height="h-56">
          {isTrendLoading ? (
            <ChartLoadingState message="Memuat tren..." />
          ) : !trendData || trendData.length === 0 ? (
            <ChartEmptyState icon={TrendingUp} message="Belum ada data tren pada periode ini" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashColorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="tanggal" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompactRupiah} width={56} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatRupiahChart(Number(v))} />} cursor={{ stroke: gridColor, strokeWidth: 1 }} />
                <Area type="monotone" dataKey="penjualan" name="Penjualan" stroke={trendColor} strokeWidth={2.5} fillOpacity={1} fill="url(#dashColorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 5 Produk Terlaris" subtitle="Berdasarkan revenue" height="h-56">
          {isProductsLoading ? (
            <ChartLoadingState message="Memuat produk terlaris..." />
          ) : !topProducts || topProducts.length === 0 ? (
            <ChartEmptyState icon={PackageSearch} message="Belum ada data produk pada periode ini" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts.slice(0, 5)} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatCompactRupiah} />
                <YAxis dataKey="nama" type="category" stroke={axisColor} fontSize={9} tickLine={false} axisLine={false} width={92} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatRupiahChart(Number(v))} />} cursor={{ fill: gridColor, opacity: 0.3 }} />
                <Bar dataKey="totalSales" name="Total Pendapatan" fill={categoricalColor(0, isDark)} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="flex justify-end print:hidden">
        <button
          onClick={() => router.push('/laporan')}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
        >
          Lihat Laporan Data Analyst lengkap
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Quick Dashboard Action Cards */}
      <div className="card-elevated bg-card border border-border/60 rounded-2xl p-6">
        <h3 className="text-base font-bold text-foreground mb-4">Informasi Operasional Dashboard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <h4 className="font-bold text-foreground">Konektivitas Open API Accurate</h4>
            <p className="text-xs text-muted-foreground">
              Aplikasi ini beroperasi dalam mode sinkronisasi data dari Open API Accurate Online ke database MySQL lokal.
              Data yang ditampilkan pada menu tabel bersumber dari database lokal untuk kecepatan pemuatan data analitik.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <h4 className="font-bold text-foreground">Analisis Visual Lanjutan</h4>
            <p className="text-xs text-muted-foreground">
              Untuk melihat laporan visual grafis seperti tren penjualan harian/bulanan, kontribusi produk terlaris, rasio kategori barang, dan segmentasi RFM pelanggan secara interaktif, silakan buka menu <strong>Laporan Data Analyst</strong>.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
