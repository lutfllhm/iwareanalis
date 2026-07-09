'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import {
  FileText, Calendar, Search, ChevronLeft, ChevronRight,
  AlertCircle, Loader2, ShoppingBag, Settings, Columns3, Building2, Check, Download
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDownload } from '@/hooks/useDownload';

interface RincianRow {
  nomorFaktur: string;
  tanggal: string;
  kodeBarang: string;
  namaBarang: string;
  kategoriBarang: string;
  namaCustomer: string;
  namaSalesman: string;
  namaCabang: string;
  kuantitas: number;
  satuan: string;
  hargaSatuan: number;
  diskon: number;
  totalHarga: number;
}

interface Cabang {
  id: number | string;
  nama: string;
}

interface ColumnDef {
  key: string;
  label: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'nomorFaktur', label: 'No. Faktur' },
  { key: 'tanggal', label: 'Tanggal' },
  { key: 'kodeBarang', label: 'Kode Barang' },
  { key: 'namaBarang', label: 'Nama Barang' },
  { key: 'kategoriBarang', label: 'Kategori' },
  { key: 'namaCustomer', label: 'Pelanggan' },
  { key: 'namaSalesman', label: 'Salesman' },
  { key: 'namaCabang', label: 'Cabang' },
  { key: 'kuantitas', label: 'Qty' },
  { key: 'hargaSatuan', label: 'Harga Satuan' },
  { key: 'diskon', label: 'Diskon' },
  { key: 'totalHarga', label: 'Total' },
];

const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMNS.map((c) => c.key).filter((k) => k !== 'namaCabang');

const formatRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0);

const formatTanggal = (val: string) => {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function RincianPenjualanPerBarangPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { canDownload, isDownloading, handleDownload } = useDownload(
    'rincian-penjualan',
    '/data/rincian-penjualan/download',
    'rincian_penjualan'
  );

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [selectedCabang, setSelectedCabang] = useState<string[]>([]);
  const [cabangOpen, setCabangOpen] = useState(false);
  const cabangRef = useRef<HTMLDivElement>(null);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('rincianPenjualan.visibleColumns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setVisibleColumns(parsed);
      } catch { /* ignore corrupt value */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rincianPenjualan.visibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cabangRef.current && !cabangRef.current.contains(e.target as Node)) setCabangOpen(false);
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter cabang sementara dinonaktifkan: field "branch" belum stabil di sisi Accurate
  // untuk laporan ini (menyebabkan response kosong). cabangList dibiarkan kosong.
  const CABANG_FILTER_ENABLED = false;
  const cabangList: Cabang[] = [];

  const toggleCabang = (id: string) => {
    setSelectedCabang((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setPage(1);
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const isColVisible = (key: string) => visibleColumns.includes(key);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['accurateRincianPenjualan', page, limit, q, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/report/rincian-penjualan-per-barang', {
        params: { page, limit, q, startDate, endDate },
      });
      return res.data;
    },
    retry: false,
  });

  const rows: RincianRow[] = data?.data || [];
  const pagination = data?.pagination;
  const isFromAccurate = data?.source === 'accurate';

  const handleSearch = () => {
    setQ(searchInput);
    setPage(1);
  };

  const totalRows = rows.length;
  const grandTotal = rows.reduce((sum, r) => sum + (r.totalHarga || 0), 0);

  const errorCode = (error as any)?.response?.data?.code;
  const errorMsg = (error as any)?.response?.data?.message || 'Gagal memuat data dari Accurate';

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary mt-0.5">
            <ShoppingBag size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                Rincian Penjualan per Barang
              </h2>
              {isFromAccurate && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                  Live Accurate
                </span>
              )}
              {data?.source === 'db' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                  Data Lokal
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Menampilkan rincian nilai penjualan per barang langsung dari Accurate Online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-xl px-3 py-2">
            <FileText size={14} className="text-primary" />
            <span className="font-semibold">Daftar Laporan / Penjualan</span>
          </div>
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
              <span>{isDownloading ? 'Mengunduh...' : 'Unduh Semua'}</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          {/* Date range */}
          <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
            <Calendar size={15} className="text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-foreground focus:outline-none w-28 font-semibold"
            />
            <span className="text-muted-foreground text-xs font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-foreground focus:outline-none w-28 font-semibold"
            />
          </div>

          {/* Branch (cabang) multi-select — sementara dinonaktifkan, lihat CABANG_FILTER_ENABLED */}
          {CABANG_FILTER_ENABLED && (
            <div className="relative" ref={cabangRef}>
              <button
                onClick={() => setCabangOpen((o) => !o)}
                className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Building2 size={15} className="text-muted-foreground" />
                {selectedCabang.length === 0
                  ? 'Semua Cabang'
                  : `${selectedCabang.length} Cabang dipilih`}
              </button>
              {cabangOpen && (
                <div className="absolute z-20 mt-2 w-64 max-h-72 overflow-y-auto bg-card border border-border rounded-xl shadow-lg p-2">
                  {cabangList.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                      Tidak ada data cabang (hanya tersedia di mode Live Accurate)
                    </p>
                  ) : (
                    cabangList.map((c) => {
                      const id = String(c.id);
                      const checked = selectedCabang.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => toggleCabang(id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted transition-colors text-left"
                        >
                          <span className={`flex items-center justify-center w-4 h-4 rounded border ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                            {checked && <Check size={12} />}
                          </span>
                          {c.nama}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Search box */}
          <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
            <Search size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari barang, faktur, pelanggan, salesman..."
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

          {/* Column visibility settings */}
          <div className="relative" ref={columnsRef}>
            <button
              onClick={() => setColumnsOpen((o) => !o)}
              className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              title="Atur kolom yang ditampilkan"
            >
              <Columns3 size={15} className="text-muted-foreground" />
              Kolom
            </button>
            {columnsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 max-h-80 overflow-y-auto bg-card border border-border rounded-xl shadow-lg p-2">
                {ALL_COLUMNS.map((col) => {
                  const checked = isColVisible(col.key);
                  return (
                    <button
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted transition-colors text-left"
                    >
                      <span className={`flex items-center justify-center w-4 h-4 rounded border ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                        {checked && <Check size={12} />}
                      </span>
                      {col.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4">
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
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-semibold">Mengambil data dari Accurate Online...</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Table header info */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {pagination?.total !== undefined
                ? `${pagination.total} baris ditemukan`
                : `${totalRows} baris ditampilkan`}
            </span>
            <span className="text-xs font-bold text-foreground">
              Grand Total: <span className="text-primary">{formatRupiah(grandTotal)}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {isColVisible('nomorFaktur') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">No. Faktur</th>}
                  {isColVisible('tanggal') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Tanggal</th>}
                  {isColVisible('kodeBarang') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Kode Barang</th>}
                  {isColVisible('namaBarang') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Nama Barang</th>}
                  {isColVisible('kategoriBarang') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Kategori</th>}
                  {isColVisible('namaCustomer') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pelanggan</th>}
                  {isColVisible('namaSalesman') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Salesman</th>}
                  {isColVisible('namaCabang') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Cabang</th>}
                  {isColVisible('kuantitas') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Qty</th>}
                  {isColVisible('hargaSatuan') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Harga Satuan</th>}
                  {isColVisible('diskon') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Diskon</th>}
                  {isColVisible('totalHarga') && <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Total</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length || 1} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      Tidak ada data pada periode yang dipilih
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={`${row.nomorFaktur}-${row.kodeBarang}-${idx}`} className="hover:bg-muted/30 transition-colors">
                      {isColVisible('nomorFaktur') && (
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                          {row.nomorFaktur}
                        </td>
                      )}
                      {isColVisible('tanggal') && (
                        <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                          {formatTanggal(row.tanggal)}
                        </td>
                      )}
                      {isColVisible('kodeBarang') && (
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {row.kodeBarang || '-'}
                        </td>
                      )}
                      {isColVisible('namaBarang') && (
                        <td className="px-4 py-3 text-xs text-foreground font-semibold">
                          {row.namaBarang}
                        </td>
                      )}
                      {isColVisible('kategoriBarang') && (
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {row.kategoriBarang ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15 font-semibold text-[11px]">
                              {row.kategoriBarang}
                            </span>
                          ) : '-'}
                        </td>
                      )}
                      {isColVisible('namaCustomer') && (
                        <td className="px-4 py-3 text-xs text-foreground">
                          {row.namaCustomer || '-'}
                        </td>
                      )}
                      {isColVisible('namaSalesman') && (
                        <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                          {row.namaSalesman || '-'}
                        </td>
                      )}
                      {isColVisible('namaCabang') && (
                        <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                          {row.namaCabang || '-'}
                        </td>
                      )}
                      {isColVisible('kuantitas') && (
                        <td className="px-4 py-3 text-xs text-right font-semibold text-foreground whitespace-nowrap">
                          {(row.kuantitas || 0).toLocaleString('id-ID')}
                          {row.satuan ? <span className="text-muted-foreground font-normal ml-1">{row.satuan}</span> : null}
                        </td>
                      )}
                      {isColVisible('hargaSatuan') && (
                        <td className="px-4 py-3 text-xs text-right text-foreground whitespace-nowrap">
                          {formatRupiah(row.hargaSatuan)}
                        </td>
                      )}
                      {isColVisible('diskon') && (
                        <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                          {row.diskon > 0 ? (
                            <span className="text-rose-500 font-semibold">-{formatRupiah(row.diskon)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )}
                      {isColVisible('totalHarga') && (
                        <td className="px-4 py-3 text-xs text-right font-bold text-foreground whitespace-nowrap">
                          {formatRupiah(row.totalHarga)}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/50 border-t-2 border-border">
                    <td
                      colSpan={Math.max(1, visibleColumns.filter((c) => !['kuantitas', 'diskon', 'totalHarga'].includes(c)).length)}
                      className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      Subtotal halaman ini ({rows.length} baris)
                    </td>
                    {isColVisible('kuantitas') && (
                      <td className="px-4 py-3 text-xs text-right font-bold text-foreground whitespace-nowrap">
                        {rows.reduce((s, r) => s + (r.kuantitas || 0), 0).toLocaleString('id-ID')}
                      </td>
                    )}
                    {isColVisible('diskon') && (
                      <td className="px-4 py-3 text-xs text-right font-bold text-rose-500 whitespace-nowrap">
                        -{formatRupiah(rows.reduce((s, r) => s + (r.diskon || 0), 0))}
                      </td>
                    )}
                    {isColVisible('totalHarga') && (
                      <td className="px-4 py-3 text-xs text-right font-bold text-primary whitespace-nowrap">
                        {formatRupiah(grandTotal)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
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
