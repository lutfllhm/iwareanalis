// Membersihkan data lama yang tersimpan dengan placeholder 'SALES-UNKNOWN' /
// 'General Sales' (bekas bug sync sebelum kolom sales dibiarkan NULL saat
// tidak diketahui). Jalankan sekali setelah deploy fix di accurateService.ts.
//
// Usage: node scripts/cleanup-unknown-sales.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const rincian = await prisma.rincianPenjualanBarang.updateMany({
    where: { id_karyawan_tenaga_penjual: 'SALES-UNKNOWN' },
    data: { id_karyawan_tenaga_penjual: null, nama_tenaga_penjual: null },
  });

  const faktur = await prisma.fakturPenjualan.updateMany({
    where: { id_karyawan_penjual_utama: 'SALES-UNKNOWN' },
    data: { id_karyawan_penjual_utama: null },
  });

  const retur = await prisma.returPenjualan.updateMany({
    where: { id_karyawan_penjual_utama: 'SALES-UNKNOWN' },
    data: { id_karyawan_penjual_utama: null },
  });

  console.log({
    rincian_diperbarui: rincian.count,
    faktur_diperbarui: faktur.count,
    retur_diperbarui: retur.count,
  });

  await prisma.$disconnect();
})();
