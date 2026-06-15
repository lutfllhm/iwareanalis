'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable, { Column } from '@/components/DataTable';
import api from '@/lib/api';
import { RefreshCw, CheckCircle, XCircle, Download } from 'lucide-react';
import { useDownload } from '@/hooks/useDownload';

interface FakturPenjualanRow {
  id: number;
  nomor: string;
  id_pelanggan: string;
  nama_pelanggan: string;
  id_karyawan_penjual_utama: string;
  tanggal: string;
  total: string;
  pembayaran: string;
  synced_at: string;
}

export default function FakturPenjualanPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Date filter range (Default to last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Query invoices list
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['fakturPenjualan', page, limit, q, sortBy, sortOrder, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/data/faktur-penjualan', {
        params: { page, limit, q, sortBy, sortOrder, startDate, endDate },
      });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Manual trigger sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync/trigger', { moduleName: 'Faktur Penjualan' });
      return res.data;
    },
    onSuccess: (resData) => {
      setToast({ type: 'success', msg: `Sinkronisasi faktur berhasil: ${resData.count} data diperbarui` });
      queryClient.invalidateQueries({ queryKey: ['fakturPenjualan'] });
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || err.message || 'Sinkronisasi gagal' });
      setTimeout(() => setToast(null), 4000);
    },
  });

  // Rupiah Currency formatter helper
  const formatRupiah = (val: string) => {
    const num = parseFloat(val);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const { canDownload, isDownloading, handleDownload } = useDownload(
    'faktur-penjualan',
    '/data/faktur-penjualan/download',
    'faktur_penjualan'
  );

  const columns: Column<FakturPenjualanRow>[] = [
    { header: 'Nomor Faktur', accessor: 'nomor', sortKey: 'nomor' },
    { header: 'Nama Pelanggan', accessor: 'nama_pelanggan', sortKey: 'nama_pelanggan' },
    { header: 'ID Sales', accessor: 'id_karyawan_penjual_utama', sortKey: 'id_karyawan_penjual_utama' },
    { 
      header: 'Tanggal', 
      accessor: 'tanggal',
      sortKey: 'tanggal',
      render: (row) => new Date(row.tanggal).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },
    { 
      header: 'Total Nilai', 
      accessor: 'total',
      sortKey: 'total',
      render: (row) => formatRupiah(row.total)
    },
    { 
      header: 'Pembayaran', 
      accessor: 'pembayaran',
      sortKey: 'pembayaran',
      render: (row) => formatRupiah(row.pembayaran)
    },
    { 
      header: 'Status Bayar', 
      accessor: (row) => {
        const total = parseFloat(row.total);
        const bayar = parseFloat(row.pembayaran);
        if (bayar >= total) return 'Lunas';
        if (bayar > 0) return 'Sebagian';
        return 'Belum Bayar';
      },
      render: (row) => {
        const total = parseFloat(row.total);
        const bayar = parseFloat(row.pembayaran);
        let badgeStyle = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
        let label = 'Belum Lunas';
        
        if (bayar >= total) {
          badgeStyle = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
          label = 'Lunas';
        } else if (bayar > 0) {
          badgeStyle = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
          label = 'Sebagian';
        }

        return (
          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeStyle}`}>
            {label}
          </span>
        );
      }
    },
  ];

  const lastSyncTime = data?.data?.[0]?.synced_at 
    ? new Date(data.data[0].synced_at).toLocaleString('id-ID') 
    : 'Belum pernah';

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Faktur Penjualan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data transaksi faktur penjualan barang/jasa, piutang, dan status bayar
          </p>
        </div>

        <div className="flex items-center space-x-3.5">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Sync Terakhir</p>
            <p className="text-xs font-semibold text-foreground">{lastSyncTime}</p>
          </div>
          {canDownload && (
            <button
              onClick={() => handleDownload(
                (msg) => { setToast({ type: 'success', msg }); setTimeout(() => setToast(null), 3000); },
                (msg) => { setToast({ type: 'error', msg }); setTimeout(() => setToast(null), 4000); }
              )}
              disabled={isDownloading}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20 hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
            >
              <Download size={15} className={isDownloading ? 'animate-pulse' : ''} />
              <span>{isDownloading ? 'Mengunduh...' : 'Unduh Semua'}</span>
            </button>
          )}
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
          >
            <RefreshCw size={15} className={syncMutation.isPending ? 'animate-spin' : ''} />
            <span>{syncMutation.isPending ? 'Mensinkronkan...' : 'Sync dari Accurate'}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 shadow-md ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data || []}
        loading={isLoading || isPlaceholderData}
        totalRows={data?.pagination?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        searchTerm={q}
        onSearchChange={(val) => { setQ(val); setPage(1); }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(col, order) => { setSortBy(col); setSortOrder(order); }}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(start, end) => { setStartDate(start); setEndDate(end); setPage(1); }}
        exportFileName="faktur_penjualan"
      />
    </DashboardLayout>
  );
}
