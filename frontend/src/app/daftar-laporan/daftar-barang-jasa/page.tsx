'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { useDownload } from '@/hooks/useDownload';
import {
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Settings,
  Download,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { AxiosError } from 'axios';

interface BarangJasaRow {
  kodeBarang: string;
  namaBarang: string;
  kategoriBarang: string;
  namaMerekBarang: string;
  nonAktif: boolean;
  tglJamPembuatan: string | null;
  ktsGdngPengguna: number;
  ktsSemuaGdng: number;
}

const formatTanggal = (val: string | null) => {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatQty = (val: number) => (val || 0).toLocaleString('id-ID');

export default function DaftarBarangJasaPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { canDownload, isDownloading, handleDownload } = useDownload(
    'barang-jasa',
    '/data/barang-jasa/download',
    'barang_jasa'
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['accurateDaftarBarangJasa', page, limit, q],
    queryFn: async () => {
      const res = await api.get('/report/daftar-barang-jasa', {
        params: { page, limit, q },
      });
      return res.data;
    },
    retry: false,
  });

  const rows: BarangJasaRow[] = data?.data || [];
  const pagination = data?.pagination;
  const isFromAccurate = data?.source === 'accurate';

  const handleSearch = () => {
    setQ(searchInput);
    setPage(1);
  };

  const apiError = error as AxiosError<{ code?: string; message?: string }> | null;
  const errorCode = apiError?.response?.data?.code;
  const errorMsg = apiError?.response?.data?.message || 'Gagal memuat data dari Accurate';

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary mt-0.5">
            <Package size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                Daftar Barang dan Jasa
              </h2>
              {isFromAccurate && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                  Live Accurate
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Menampilkan daftar barang dan jasa langsung dari Accurate Online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canDownload && (
            <button
              onClick={() => handleDownload(
                (msg) => { setToast({ type: 'success', msg }); setTimeout(() => setToast(null), 3000); },
                (msg) => { setToast({ type: 'error', msg }); setTimeout(() => setToast(null), 4000); }
              )}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20 hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
            >
              <Download size={15} className={isDownloading ? 'animate-pulse' : ''} />
              <span>{isDownloading ? 'Mengunduh...' : 'Unduh Database'}</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="card-elevated bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
            <Search size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari kode barang, nama barang, kategori..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-transparent text-xs text-foreground focus:outline-none flex-1 placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSearch}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors px-1"
            >
              Cari
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 flex items-start gap-4">
          <AlertCircle size={22} className="text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-rose-600 dark:text-rose-400 text-sm">Gagal Memuat Data</p>
            <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1">{errorMsg}</p>
            {(errorCode === 'NOT_CONNECTED' || errorCode === 'TOKEN_EXPIRED') && (
              <button
                onClick={() => router.push('/settings')}
                className="mt-3 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
              >
                <Settings size={13} />
                Buka Pengaturan Accurate
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-semibold">Mengambil data dari Accurate Online...</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="card-elevated bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {pagination?.total !== undefined
                ? `${pagination.total} baris ditemukan`
                : `${rows.length} baris ditampilkan`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Kode Barang</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Nama Barang</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Kategori Barang</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Nama Merek Barang</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center whitespace-nowrap">Non Aktif</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Tgl/Jam Pembuatan</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Kts (Gdng Pengguna)</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Kts (Semua Gdng)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      Tidak ada data barang dan jasa ditemukan
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.kodeBarang} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                        {row.kodeBarang}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-semibold">
                        {row.namaBarang}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {row.kategoriBarang ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15 font-semibold text-[11px]">
                            {row.kategoriBarang}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                        {row.namaMerekBarang || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-center whitespace-nowrap">
                        {row.nonAktif ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold text-[11px]">
                            Ya
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                            Tidak
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                        {formatTanggal(row.tglJamPembuatan)}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-semibold text-foreground whitespace-nowrap">
                        {formatQty(row.ktsGdngPengguna)}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-semibold text-foreground whitespace-nowrap">
                        {formatQty(row.ktsSemuaGdng)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
              <span className="text-xs text-muted-foreground font-semibold">
                Halaman {pagination.page} dari {pagination.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        pageNum === page
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'border border-border bg-card hover:bg-muted text-foreground'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
