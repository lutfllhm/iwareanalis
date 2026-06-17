'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { FileText, Package, RotateCcw, TrendingUp, Warehouse, List } from 'lucide-react';
import Link from 'next/link';

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
}

const salesReports: ReportCard[] = [
  {
    title: 'Daftar Faktur Penjualan',
    description: 'Laporan yang berisi daftar faktur penjualan',
    href: '/daftar-laporan/penjualan/daftar-faktur',
    icon: FileText,
    color: 'blue',
  },
  {
    title: 'Rincian Penjualan per Barang',
    description: 'Detail penjualan untuk setiap barang/jasa',
    href: '/daftar-laporan/rincian-penjualan-per-barang',
    icon: Package,
    color: 'green',
  },
  {
    title: 'Daftar Retur Penjualan',
    description: 'Laporan retur penjualan dari pelanggan',
    href: '/daftar-laporan/penjualan/daftar-retur',
    icon: RotateCcw,
    color: 'orange',
  },
  {
    title: 'Ringkasan Mutasi Stok',
    description: 'Ringkasan mutasi stok barang/jasa',
    href: '/daftar-laporan/penjualan/ringkasan-mutasi-stok',
    icon: TrendingUp,
    color: 'purple',
  },
  {
    title: 'Mutasi Serial Number',
    description: 'Daftar mutasi Serial/Produk dengan filter yang sesuai',
    href: '/daftar-laporan/penjualan/mutasi-serial-number',
    icon: List,
    color: 'indigo',
  },
  {
    title: 'Serial Number per Gudang',
    description: 'Daftar Serial Number per Gudang',
    href: '/daftar-laporan/penjualan/serial-number-per-gudang',
    icon: Warehouse,
    color: 'teal',
  },
];

export default function DaftarLaporanPenjualanPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">
            Daftar Laporan Penjualan
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih laporan penjualan yang ingin Anda lihat dari Accurate Online
          </p>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salesReports.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.href} href={report.href}>
                <Card className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary group">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-xl bg-${report.color}-500/10 text-${report.color}-600 group-hover:scale-110 transition-transform`}
                    >
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="p-6 bg-muted/30">
          <h3 className="font-bold text-foreground mb-3 flex items-center space-x-2">
            <FileText size={20} className="text-primary" />
            <span>Tentang Daftar Laporan Penjualan</span>
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start space-x-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Data laporan di-sync secara otomatis dari Accurate Online sesuai jadwal yang dikonfigurasi
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Anda dapat melakukan sync manual dengan menekan tombol "Sync" di setiap halaman laporan
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Semua data dapat di-download ke format CSV yang kompatibel dengan Microsoft Excel
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Gunakan filter dan pencarian untuk menemukan data yang Anda butuhkan dengan cepat
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
