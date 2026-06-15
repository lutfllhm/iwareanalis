'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable, { Column } from '@/components/DataTable';
import api from '@/lib/api';
import { RefreshCw, CheckCircle, XCircle, Download } from 'lucide-react';
import { useDownload } from '@/hooks/useDownload';

interface PelangganRow {
  id: number;
  id_pelanggan: string;
  nama: string;
  kategori_pelanggan: string;
  non_aktif: boolean;
  kota_pengiriman: string;
  provinsi_pengiriman: string;
  nama_default_penjual: string;
  alamat_lengkap_pengiriman: string;
  synced_at: string;
}

export default function PelangganPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('id_pelanggan');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Query customers data
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['pelanggan', page, limit, q, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get('/data/pelanggan', {
        params: { page, limit, q, sortBy, sortOrder },
      });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Trigger manual sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync/trigger', { moduleName: 'Pelanggan' });
      return res.data;
    },
    onSuccess: (resData) => {
      setToast({ type: 'success', msg: `Sinkronisasi pelanggan berhasil: ${resData.count} data diperbarui` });
      queryClient.invalidateQueries({ queryKey: ['pelanggan'] });
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || err.message || 'Sinkronisasi gagal' });
      setTimeout(() => setToast(null), 4000);
    },
  });

  // Check download permission & handle download
  const { canDownload, isDownloading, handleDownload } = useDownload(
    'pelanggan',
    '/data/pelanggan/download',
    'pelanggan'
  );

  const columns: Column<PelangganRow>[] = [
    { header: 'ID Pelanggan', accessor: 'id_pelanggan', sortKey: 'id_pelanggan' },
    { header: 'Nama Pelanggan', accessor: 'nama', sortKey: 'nama' },
    { header: 'Kategori', accessor: 'kategori_pelanggan', sortKey: 'kategori_pelanggan' },
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
    { header: 'Sales Utama', accessor: 'nama_default_penjual', sortKey: 'nama_default_penjual' },
    { header: 'Kota', accessor: 'kota_pengiriman', sortKey: 'kota_pengiriman' },
    { header: 'Provinsi', accessor: 'provinsi_pengiriman', sortKey: 'provinsi_pengiriman' },
    { 
      header: 'Alamat Pengiriman', 
      accessor: 'alamat_lengkap_pengiriman',
      render: (row) => (
        <span className="text-xs truncate block max-w-xs text-muted-foreground" title={row.alamat_lengkap_pengiriman}>
          {row.alamat_lengkap_pengiriman || '-'}
        </span>
      )
    },
  ];

  const lastSyncTime = data?.data?.[0]?.synced_at 
    ? new Date(data.data[0].synced_at).toLocaleString('id-ID') 
    : 'Belum pernah';

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Daftar Pelanggan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data master profil pelanggan, sales default, dan wilayah pengiriman
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
        exportFileName="pelanggan"
      />
    </DashboardLayout>
  );
}
