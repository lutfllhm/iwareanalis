'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable, { Column } from '@/components/DataTable';
import api from '@/lib/api';
import { CheckCircle, XCircle, Download } from 'lucide-react';
import { useDownload } from '@/hooks/useDownload';
import type { AxiosError } from 'axios';

interface ReturPenjualanRow {
  id: number;
  nomor: string;
  id_pelanggan: string;
  nama_pelanggan: string;
  id_karyawan_penjual_utama: string;
  tanggal: string;
  total: string;
  pembayaran_faktur_penjualan: string;
  nilai_retur_faktur: string;
}

export default function ReturPenjualanPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch returns list (live proxy ke Accurate)
  const { data, isLoading, isPlaceholderData, isError, error } = useQuery({
    queryKey: ['daftar-retur-penjualan', page, limit, q, sortBy, sortOrder, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/report/daftar-retur-penjualan', {
        params: { page, limit, q, sortBy, sortOrder, startDate, endDate },
      });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const formatRupiah = (val: string) => {
    const num = parseFloat(val);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const { canDownload, isDownloading, handleDownload } = useDownload(
    'retur-penjualan',
    '/data/retur-penjualan/download',
    'retur_penjualan'
  );

  const columns: Column<ReturPenjualanRow>[] = [
    { header: 'Nomor Retur', accessor: 'nomor', sortKey: 'nomor' },
    { header: 'Nama Pelanggan', accessor: 'nama_pelanggan', sortKey: 'nama_pelanggan' },
    { header: 'ID Sales', accessor: 'id_karyawan_penjual_utama', sortKey: 'id_karyawan_penjual_utama' },
    { 
      header: 'Tanggal Retur', 
      accessor: 'tanggal',
      sortKey: 'tanggal',
      render: (row) => new Date(row.tanggal).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },
    { 
      header: 'Total Retur', 
      accessor: 'total',
      sortKey: 'total',
      render: (row) => formatRupiah(row.total)
    },
    { 
      header: 'Nilai Retur Faktur', 
      accessor: 'nilai_retur_faktur',
      sortKey: 'nilai_retur_faktur',
      render: (row) => formatRupiah(row.nilai_retur_faktur)
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Retur Penjualan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data retur barang, klaim faktur, dan pengurangan nilai tagihan penjualan
          </p>
        </div>

        <div className="flex items-center space-x-3.5">
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
              <span>{isDownloading ? 'Mengunduh...' : 'Unduh Database'}</span>
            </button>
          )}
        </div>
      </div>

      {isError && (
        <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center space-x-3 shadow-md">
          <XCircle size={20} />
          <span className="text-sm font-semibold">
            {(error as AxiosError<{ message?: string }> | null)?.response?.data?.message || 'Gagal memuat data dari Accurate'}
          </span>
        </div>
      )}

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
        exportFileName="retur_penjualan"
        showExportButtons={false}
      />
    </DashboardLayout>
  );
}
