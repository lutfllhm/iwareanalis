'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface FakturPenjualan {
  id: number;
  nomor: string;
  id_pelanggan: string;
  nama_pelanggan: string;
  id_karyawan_penjual_utama: string | null;
  tanggal: string;
  total: number;
  pembayaran: number;
}

export default function DaftarFakturPenjualanPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch data (live proxy ke Accurate)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['daftar-faktur-penjualan', page, limit, searchQuery, sortBy, sortOrder, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/report/daftar-faktur-penjualan', {
        params: {
          page,
          limit,
          q: searchQuery,
          sortBy,
          sortOrder,
          startDate,
          endDate,
        },
      });
      return res.data;
    },
  });

  const handleDownload = async () => {
    try {
      const response = await api.get('/data/faktur-penjualan/download', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `faktur_penjualan_${new Date().toISOString().split('T')[0]}.sql`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      setToast({ type: 'error', msg: 'Gagal mengunduh data' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalPages = data?.pagination?.totalPages || 1;
  const saldoPiutang = (total: number, pembayaran: number) => total - pembayaran;
  const statusBayar = (total: number, pembayaran: number) => {
    const saldo = saldoPiutang(total, pembayaran);
    if (saldo === 0) return 'lunas';
    if (pembayaran > 0) return 'sebagian';
    return 'belum';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              Daftar Faktur Penjualan
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Laporan yang berisi daftar faktur penjualan dari Accurate Online
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Database</span>
            </Button>
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-600 flex items-center space-x-3 shadow-md">
            <XCircle size={20} />
            <span className="text-sm font-semibold">
              {(error as any)?.response?.data?.message || 'Gagal memuat data dari Accurate'}
            </span>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center space-x-3 shadow-md ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cari nomor faktur, pelanggan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="text-muted-foreground h-4 w-4" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Dari tanggal"
                className="text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="text-muted-foreground h-4 w-4" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Sampai tanggal"
                className="text-sm"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Urutkan berdasarkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tanggal">Tanggal</SelectItem>
                <SelectItem value="nomor">Nomor Faktur</SelectItem>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="nama_pelanggan">Pelanggan</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Urutan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableCaption>Daftar faktur penjualan dari Accurate Online</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Faktur</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pembayaran</TableHead>
                <TableHead className="text-right">Saldo Piutang</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Tidak ada faktur penjualan ditemukan
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((item: FakturPenjualan) => {
                  const status = statusBayar(Number(item.total), Number(item.pembayaran));
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium font-mono">
                        {item.nomor}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(item.tanggal)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.nama_pelanggan}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.id_pelanggan}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(item.total))}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(Number(item.pembayaran))}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-semibold">
                        {formatCurrency(
                          saldoPiutang(Number(item.total), Number(item.pembayaran))
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {status === 'lunas' && (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            Lunas
                          </Badge>
                        )}
                        {status === 'sebagian' && (
                          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            Sebagian
                          </Badge>
                        )}
                        {status === 'belum' && (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                            Belum Lunas
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan halaman {page} dari {totalPages} ({data?.pagination?.total || 0}{' '}
            total faktur)
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
