'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable, { Column } from '@/components/DataTable';
import api from '@/lib/api';
import { RefreshCw, CheckCircle, XCircle, Download } from 'lucide-react';
import { useDownload } from '@/hooks/useDownload';

interface BarangJasaRow {
  id: number;
  kode_barang: string;
  nama_barang: string;
  kategori_barang: string;
  nama_merek_barang: string;
  non_aktif: boolean;
  tgl_jam_pembuatan: string;
  kts_gdng_pengguna: string;
  kts_semua_gdng: string;
  synced_at: string;
}

export default function BarangJasaPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('kode_barang');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Custom states
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch Goods & Services data
  const { data, isLoading, isPlaceholderData, refetch } = useQuery({
    queryKey: ['barangJasa', page, limit, q, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get('/data/barang-jasa', {
        params: { page, limit, q, sortBy, sortOrder },
      });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Manual Sync Modul Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync/trigger', { moduleName: 'Barang & Jasa' });
      return res.data;
    },
    onSuccess: (resData) => {
      setToast({ type: 'success', msg: `Sinkronisasi berhasil: ${resData.count} data diperbarui` });
      queryClient.invalidateQueries({ queryKey: ['barangJasa'] });
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || err.message || 'Sinkronisasi gagal' });
      setTimeout(() => setToast(null), 4000);
    },
  });

  const { canDownload, isDownloading, handleDownload } = useDownload(
    'barang-jasa',
    '/data/barang-jasa/download',
    'barang_jasa'
  );

  const columns: Column<BarangJasaRow>[] = [
    { header: 'Kode Barang', accessor: 'kode_barang', sortKey: 'kode_barang' },
    { header: 'Nama Barang', accessor: 'nama_barang', sortKey: 'nama_barang' },
    { header: 'Kategori', accessor: 'kategori_barang', sortKey: 'kategori_barang' },
    { header: 'Merek', accessor: 'nama_merek_barang', sortKey: 'nama_merek_barang' },
    { 
      header: 'Status', 
      accessor: 'non_aktif',
      sortKey: 'non_aktif',
      render: (row) => (
        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
          row.non_aktif 
            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
        }`}>
          {row.non_aktif ? 'Non Aktif' : 'Aktif'}
        </span>
      )
    },
    { 
      header: 'Kuantitas (Gudang)', 
      accessor: 'kts_gdng_pengguna',
      sortKey: 'kts_gdng_pengguna',
      render: (row) => parseFloat(row.kts_gdng_pengguna).toLocaleString('id-ID')
    },
    { 
      header: 'Kuantitas (Semua)', 
      accessor: 'kts_semua_gdng',
      sortKey: 'kts_semua_gdng',
      render: (row) => parseFloat(row.kts_semua_gdng).toLocaleString('id-ID')
    },
    { 
      header: 'Tgl Pembuatan', 
      accessor: 'tgl_jam_pembuatan',
      sortKey: 'tgl_jam_pembuatan',
      render: (row) => new Date(row.tgl_jam_pembuatan).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
  ];

  // Last synced timestamp display helper
  const lastSyncTime = data?.data?.[0]?.synced_at 
    ? new Date(data.data[0].synced_at).toLocaleString('id-ID') 
    : 'Belum pernah';

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Daftar Barang & Jasa</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data master barang, jasa, persediaan gudang, dan kategorisasi
          </p>
        </div>

        {/* Sync Button controls */}
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

      {/* Floating Status Toast banner */}
      {toast && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 shadow-md animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Data Table */}
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
        exportFileName="barang_jasa"
      />
    </DashboardLayout>
  );
}
