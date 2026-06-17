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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Eye,
  Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface TransaksiPenjualan {
  id: number;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  nama_cabang: string | null;
  nomor_id_pelanggan: string | null;
  nama_pelanggan: string | null;
  total: number;
  kategori_pelanggan: string | null;
  isi_diskon: number;
  notes: string | null;
  synced_at: string;
}

interface TransaksiDetail {
  id: number;
  nomor_kode_barang: string;
  nama_barang: string;
  kuantitas: number;
  harga_jual: number;
  isi_diskon: number;
  nama_kategori_barang: string | null;
  nama_gudang: string | null;
}

interface TransaksiPayment {
  id: number;
  nomor_akun_bank_pembayaran: string;
  daftar_dilakukan: number;
  tanggal_pembayaran: string;
}

export default function TransaksiPenjualanPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('tanggal_transaksi');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiPenjualan | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch data transaksi penjualan
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['transaksi-penjualan', page, limit, searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get('/data/transaksi-penjualan', {
        params: {
          page,
          limit,
          q: searchQuery,
          sortBy,
          sortOrder,
        },
      });
      return res.data;
    },
  });

  // Fetch detail transaksi
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['transaksi-detail', selectedTransaksi?.id],
    queryFn: async () => {
      if (!selectedTransaksi) return null;
      const res = await api.get(`/data/transaksi-penjualan/${selectedTransaksi.id}`);
      return res.data;
    },
    enabled: !!selectedTransaksi,
  });

  const handleDownload = async () => {
    try {
      const response = await api.get('/data/transaksi-penjualan/download', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transaksi_penjualan_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              Transaksi Penjualan
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Data transaksi penjualan lengkap dari Accurate Online POS API
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
              <span>Download CSV</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cari nomor transaksi, pelanggan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Urutkan berdasarkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tanggal_transaksi">Tanggal Transaksi</SelectItem>
                <SelectItem value="nomor_transaksi">Nomor Transaksi</SelectItem>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="nama_pelanggan">Nama Pelanggan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
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
            <TableCaption>
              Daftar transaksi penjualan dari Accurate Online
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Transaksi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Diskon</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Tidak ada transaksi ditemukan
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((item: TransaksiPenjualan) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nomor_transaksi}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDate(item.tanggal_transaksi)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.nama_pelanggan || '-'}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.nomor_id_pelanggan || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{item.nama_cabang || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(item.total))}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {Number(item.isi_diskon) > 0 ? formatCurrency(Number(item.isi_diskon)) : '-'}
                    </TableCell>
                    <TableCell>
                      {item.kategori_pelanggan ? (
                        <Badge variant="secondary">{item.kategori_pelanggan}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Dialog open={isDetailOpen && selectedTransaksi?.id === item.id} onOpenChange={setIsDetailOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaksi(item);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Detail Transaksi {item.nomor_transaksi}</DialogTitle>
                            <DialogDescription>
                              Informasi lengkap transaksi penjualan
                            </DialogDescription>
                          </DialogHeader>
                          
                          {detailLoading ? (
                            <div className="py-10 text-center">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Header Info */}
                              <Card className="p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Nomor Transaksi</p>
                                    <p className="font-semibold">{detailData?.nomor_transaksi}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Tanggal</p>
                                    <p className="font-semibold">{formatDate(detailData?.tanggal_transaksi)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Pelanggan</p>
                                    <p className="font-semibold">{detailData?.nama_pelanggan}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="font-semibold text-green-600">
                                      {formatCurrency(Number(detailData?.total))}
                                    </p>
                                  </div>
                                </div>
                              </Card>

                              {/* Items */}
                              <div>
                                <h3 className="font-semibold mb-2">Item Barang</h3>
                                <div className="border rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Kode</TableHead>
                                        <TableHead>Nama Barang</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Harga</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {detailData?.detail_items?.map((item: TransaksiDetail) => (
                                        <TableRow key={item.id}>
                                          <TableCell className="font-mono text-sm">
                                            {item.nomor_kode_barang}
                                          </TableCell>
                                          <TableCell>{item.nama_barang}</TableCell>
                                          <TableCell className="text-right">
                                            {Number(item.kuantitas)}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {formatCurrency(Number(item.harga_jual))}
                                          </TableCell>
                                          <TableCell className="text-right font-semibold">
                                            {formatCurrency(
                                              Number(item.kuantitas) * Number(item.harga_jual)
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              {/* Payments */}
                              {detailData?.payments?.length > 0 && (
                                <div>
                                  <h3 className="font-semibold mb-2">Pembayaran</h3>
                                  <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Metode Pembayaran</TableHead>
                                          <TableHead>Tanggal</TableHead>
                                          <TableHead className="text-right">Jumlah</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {detailData?.payments?.map((payment: TransaksiPayment) => (
                                          <TableRow key={payment.id}>
                                            <TableCell>{payment.nomor_akun_bank_pembayaran}</TableCell>
                                            <TableCell>{formatDate(payment.tanggal_pembayaran)}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                              {formatCurrency(Number(payment.daftar_dilakukan))}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan halaman {page} dari {totalPages} ({data?.pagination?.total || 0} total transaksi)
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
