'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  List,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface MutasiSerialNumber {
  id: number;
  kode_barang: string;
  serial_number: string;
  tanggal: string;
  tipe_mutasi: string;
  jumlah: number;
  nama_gudang: string | null;
  keterangan: string | null;
  synced_at: string;
}

export default function MutasiSerialNumberPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mutasi-serial-number', page, limit, searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get('/analytics/serial-number-mutation', {
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

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync/trigger', { moduleName: 'Mutasi Serial Number' });
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: `Sinkronisasi berhasil! ${data.count} data di-sync.` });
      queryClient.invalidateQueries({ queryKey: ['mutasi-serial-number'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (error: any) => {
      setToast({
        type: 'error',
        msg: error.response?.data?.message || 'Sinkronisasi gagal',
      });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getMutasiColor = (tipe: string) => {
    if (tipe.toLowerCase().includes('masuk') || tipe.toLowerCase().includes('in')) {
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    }
    if (tipe.toLowerCase().includes('keluar') || tipe.toLowerCase().includes('out')) {
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    }
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  };

  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              Mutasi Serial Number
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Daftar data Mutasi Serial/Produk dengan filter yang sesuai
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center space-x-2"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Sync</span>
            </Button>
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
              onClick={async () => {
                try {
                  const response = await api.get('/analytics/serial-number-mutation/download', {
                    responseType: 'blob',
                  });
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `mutasi_serial_number_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (error) {
                  console.error('Download failed:', error);
                }
              }}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV</span>
            </Button>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center space-x-3 shadow-md ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cari kode barang, serial number..."
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
                <SelectItem value="tanggal">Tanggal</SelectItem>
                <SelectItem value="kode_barang">Kode Barang</SelectItem>
                <SelectItem value="serial_number">Serial Number</SelectItem>
                <SelectItem value="tipe_mutasi">Tipe Mutasi</SelectItem>
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
            <TableCaption>Daftar mutasi serial number dari Accurate Online</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Kode Barang</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe Mutasi</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Gudang</TableHead>
                <TableHead>Keterangan</TableHead>
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
                    <List className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Tidak ada data mutasi serial number
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((item: MutasiSerialNumber) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.kode_barang}</TableCell>
                    <TableCell className="font-mono font-semibold">{item.serial_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(item.tanggal)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getMutasiColor(item.tipe_mutasi)}>
                        {item.tipe_mutasi}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {Number(item.jumlah).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      {item.nama_gudang ? (
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.nama_gudang}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {item.keterangan || '-'}
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
            Menampilkan halaman {page} dari {totalPages} ({data?.pagination?.total || 0} total
            mutasi)
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
