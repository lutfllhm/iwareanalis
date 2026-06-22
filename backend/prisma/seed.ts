import { PrismaClient, Role, SyncStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting DB Seeding...');

  // 1. Clean Database
  await prisma.auditLog.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.rincianPenjualanBarang.deleteMany();
  await prisma.returPenjualan.deleteMany();
  await prisma.fakturPenjualan.deleteMany();
  await prisma.pelanggan.deleteMany();
  await prisma.barangJasa.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database cleaned.');

  // 2. Create Users
  const saltRounds = 12;
  const adminPasswordHash = await bcrypt.hash('jasad666', saltRounds);
  const analystPasswordHash = await bcrypt.hash('AnalystPassword123!', saltRounds);
  const viewerPasswordHash = await bcrypt.hash('ViewerPassword123!', saltRounds);

  await prisma.user.createMany({
    data: [
      {
        nama: 'Superadmin',
        email: 'admin@iware.id',
        password_hash: adminPasswordHash,
        role: Role.admin,
        is_active: true,
      },
      {
        nama: 'Data Analyst',
        email: 'analyst@dataanalis.com',
        password_hash: analystPasswordHash,
        role: Role.analyst,
        is_active: true,
      },
      {
        nama: 'Executive Viewer',
        email: 'viewer@dataanalis.com',
        password_hash: viewerPasswordHash,
        role: Role.viewer,
        is_active: true,
      },
    ],
  });
  console.log('Default users created.');

  // 3. Create Settings
  await prisma.setting.createMany({
    data: [
      { key: 'ACCURATE_APP_KEY', value: '' },
      { key: 'ACCURATE_SIGNATURE_SECRET', value: '' },
      { key: 'ACCURATE_API_TOKEN', value: '' },
      { key: 'ACCURATE_DB_ID', value: '12345' },
      { key: 'ACCURATE_DB_NAME', value: 'PT. Maju Bersama' },
      { key: 'SYNC_INTERVAL_CRON', value: '0 */4 * * *' }, // every 4 hours
      { key: 'ACCURATE_SESSION_HOST', value: '' },
    ],
  });
  console.log('Initial settings created.');

  // 4. Create Barang & Jasa
  const itemsData = [
    { kode_barang: 'BRG-001', nama_barang: 'Laptop ASUS ROG Strix', kategori_barang: 'Komputer & Laptop', nama_merek_barang: 'ASUS', kts_gdng_pengguna: 15.0, kts_semua_gdng: 45.0, price: 18500000 },
    { kode_barang: 'BRG-002', nama_barang: 'MacBook M3 Air 13"', kategori_barang: 'Komputer & Laptop', nama_merek_barang: 'Apple', kts_gdng_pengguna: 8.0, kts_semua_gdng: 20.0, price: 16200000 },
    { kode_barang: 'BRG-003', nama_barang: 'Logitech G Pro X Superlight', kategori_barang: 'Aksesoris', nama_merek_barang: 'Logitech', kts_gdng_pengguna: 50.0, kts_semua_gdng: 120.0, price: 1950000 },
    { kode_barang: 'BRG-004', nama_barang: 'Monitor Dell 27" 4K U2723QE', kategori_barang: 'Monitor', nama_merek_barang: 'Dell', kts_gdng_pengguna: 12.0, kts_semua_gdng: 35.0, price: 7490000 },
    { kode_barang: 'BRG-005', nama_barang: 'Epson L3210 Ink Tank Printer', kategori_barang: 'Printer', nama_merek_barang: 'Epson', kts_gdng_pengguna: 22.0, kts_semua_gdng: 60.0, price: 2350000 },
    { kode_barang: 'BRG-006', nama_barang: 'SSD Samsung 990 Pro 1TB', kategori_barang: 'Komponen Komputer', nama_merek_barang: 'Samsung', kts_gdng_pengguna: 85.0, kts_semua_gdng: 210.0, price: 1750000 },
    { kode_barang: 'BRG-007', nama_barang: 'Jasa Instalasi Jaringan & Server', kategori_barang: 'Jasa Profesional', nama_merek_barang: 'N/A', kts_gdng_pengguna: 0.0, kts_semua_gdng: 0.0, price: 5000000 },
    { kode_barang: 'BRG-008', nama_barang: 'Jasa Pemeliharaan Bulanan', kategori_barang: 'Jasa Profesional', nama_merek_barang: 'N/A', kts_gdng_pengguna: 0.0, kts_semua_gdng: 0.0, price: 2500000 },
  ];

  for (const item of itemsData) {
    const { price, ...rest } = item;
    await prisma.barangJasa.create({
      data: {
        ...rest,
        non_aktif: false,
        tgl_jam_pembuatan: new Date('2025-01-15T08:00:00Z'),
      },
    });
  }
  console.log('Barang & Jasa seeded.');

  // 5. Create Pelanggan
  const customers = [
    {
      id_pelanggan: 'CUST-001',
      nama: 'PT. Sentosa Abadi',
      kategori_pelanggan: 'Korporat',
      kota_pengiriman: 'Jakarta Selatan',
      provinsi_pengiriman: 'DKI Jakarta',
      nama_default_penjual: 'Budi Santoso',
      alamat_lengkap_pengiriman: 'Jl. Jend. Sudirman Kav 21, Karet Kuningan',
    },
    {
      id_pelanggan: 'CUST-002',
      nama: 'CV. Bintang Mas',
      kategori_pelanggan: 'Reseller',
      kota_pengiriman: 'Surabaya',
      provinsi_pengiriman: 'Jawa Timur',
      nama_default_penjual: 'Dewi Lestari',
      alamat_lengkap_pengiriman: 'Jl. Basuki Rahmat No 88, Tegalsari',
    },
    {
      id_pelanggan: 'CUST-003',
      nama: 'Universitas Nusa Bangsa',
      kategori_pelanggan: 'Pemerintah/Edukasi',
      kota_pengiriman: 'Bandung',
      provinsi_pengiriman: 'Jawa Barat',
      nama_default_penjual: 'Budi Santoso',
      alamat_lengkap_pengiriman: 'Jl. Dago No 123, Coblong',
    },
    {
      id_pelanggan: 'CUST-004',
      nama: 'Toko Berkah Utama',
      kategori_pelanggan: 'Retail',
      kota_pengiriman: 'Medan',
      provinsi_pengiriman: 'Sumatera Utara',
      nama_default_penjual: 'Hendra Wijaya',
      alamat_lengkap_pengiriman: 'Jl. S. Parman No 45, Petisah',
    },
    {
      id_pelanggan: 'CUST-005',
      nama: 'PT. Teknologi Masa Depan',
      kategori_pelanggan: 'Korporat',
      kota_pengiriman: 'Tangerang',
      provinsi_pengiriman: 'Banten',
      nama_default_penjual: 'Dewi Lestari',
      alamat_lengkap_pengiriman: 'Gading Serpong, Boulevard Baru No 2',
    },
  ];

  for (const cust of customers) {
    await prisma.pelanggan.create({
      data: {
        ...cust,
        id_karyawan_default_penjual: cust.nama_default_penjual === 'Budi Santoso' ? 'SALES-01' : cust.nama_default_penjual === 'Dewi Lestari' ? 'SALES-02' : 'SALES-03',
        id_karyawan_tenaga_penjual_kedua: null,
        non_aktif: false,
        tgl_jam_pembuatan: new Date('2025-01-20T09:00:00Z'),
      },
    });
  }
  console.log('Pelanggan seeded.');

  // 6. Generate Invoices, Invoice Details, and Returns over the last 60 days
  const salespersonMap: { [key: string]: string } = {
    'SALES-01': 'Budi Santoso',
    'SALES-02': 'Dewi Lestari',
    'SALES-03': 'Hendra Wijaya',
  };

  const invoiceCount = 42;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60);

  console.log(`Generating ${invoiceCount} invoices over the last 60 days...`);

  for (let i = 1; i <= invoiceCount; i++) {
    const invoiceNum = `INV/2026/${String(i).padStart(3, '0')}`;
    
    // Pick random customer
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const salesId = customer.nama_default_penjual === 'Budi Santoso' ? 'SALES-01' : customer.nama_default_penjual === 'Dewi Lestari' ? 'SALES-02' : 'SALES-03';
    const salesName = salespersonMap[salesId];

    // Calculate dates
    const invoiceDate = new Date(startDate.getTime());
    // Space invoices over 60 days
    invoiceDate.setDate(startDate.getDate() + Math.floor((i / invoiceCount) * 58));

    // Determine lines
    const lineItemCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
    const details = [];
    let invoiceTotal = 0;

    for (let l = 0; l < lineItemCount; l++) {
      const item = itemsData[Math.floor(Math.random() * itemsData.length)];
      const qty = Math.floor(Math.random() * 5) + 1;
      const unitPrice = item.price;
      const lineTotal = qty * unitPrice;
      invoiceTotal += lineTotal;

      details.push({
        kode: item.kode_barang,
        nama_barang: item.nama_barang,
        kuantitas: qty,
        harga: unitPrice,
        total_harga: lineTotal,
        penjualan: lineTotal,
        tanggal: invoiceDate,
        nama_pelanggan: customer.nama,
        nama_tenaga_penjual: salesName,
        id_karyawan_tenaga_penjual: salesId,
        id_karyawan_tenaga_penjual_kedua: null,
      });
    }

    // Set payment (some fully paid, some partially, some unpaid)
    let payment = invoiceTotal;
    const paymentRand = Math.random();
    if (paymentRand < 0.15) {
      payment = 0; // unpaid
    } else if (paymentRand < 0.3) {
      payment = Math.round(invoiceTotal * 0.5); // partially paid
    }

    // Create Invoice
    await prisma.fakturPenjualan.create({
      data: {
        nomor: invoiceNum,
        id_pelanggan: customer.id_pelanggan,
        id_karyawan_penjual_utama: salesId,
        tanggal: invoiceDate,
        total: invoiceTotal,
        pembayaran: payment,
        synced_at: new Date(),
        rincian: {
          create: details,
        },
      },
    });

    // 7. Generate returns for ~10% of invoices
    if (i % 8 === 0) {
      const returnNum = `RET/2026/${String(i).padStart(3, '0')}`;
      const returnTotal = Math.round(invoiceTotal * (Math.random() * 0.5 + 0.1)); // returing 10% to 60% of total
      
      await prisma.returPenjualan.create({
        data: {
          nomor: returnNum,
          id_pelanggan: customer.id_pelanggan,
          id_karyawan_penjual_utama: salesId,
          tanggal: new Date(invoiceDate.getTime() + 3 * 24 * 60 * 60 * 1000), // returned 3 days later
          total: returnTotal,
          pembayaran_faktur_penjualan: returnTotal,
          nilai_retur_faktur: returnTotal,
          synced_at: new Date(),
        },
      });
    }
  }

  // 8. Create Sync Logs
  await prisma.syncLog.createMany({
    data: [
      { modul: 'Barang & Jasa', status: SyncStatus.SUCCESS, jumlah_baris: itemsData.length, durasi_ms: 124, created_at: new Date(Date.now() - 3600000) },
      { modul: 'Pelanggan', status: SyncStatus.SUCCESS, jumlah_baris: customers.length, durasi_ms: 98, created_at: new Date(Date.now() - 3500000) },
      { modul: 'Faktur Penjualan', status: SyncStatus.SUCCESS, jumlah_baris: invoiceCount, durasi_ms: 456, created_at: new Date(Date.now() - 3400000) },
      { modul: 'Retur Penjualan', status: SyncStatus.SUCCESS, jumlah_baris: 5, durasi_ms: 85, created_at: new Date(Date.now() - 3300000) },
    ],
  });

  // 9. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { user_id: 1, user_email: 'admin@iware.id', aksi: 'LOGIN_SUCCESS', target: 'Users', ip_address: '127.0.0.1', user_agent: 'Mozilla/5.0' },
      { user_id: 1, user_email: 'admin@iware.id', aksi: 'SYNC_DATABASE', target: 'Accurate API', ip_address: '127.0.0.1', user_agent: 'Mozilla/5.0' },
    ],
  });

  console.log('DB Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Error during DB Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
