const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.rincianPenjualanBarang.findMany({
    where: { id_karyawan_tenaga_penjual: 'SALES-UNKNOWN' },
    select: { nomor: true, nama_barang: true, tanggal: true },
    take: 5,
    orderBy: { tanggal: 'desc' },
  });
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
})();
