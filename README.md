# Accurate Online - Data Analyst Sales Dashboard

Aplikasi web dashboard analitik dan visualisasi data penjualan (Sales Invoice & Return) yang terintegrasi secara real-time dengan Open API resmi **Accurate Online**. Dilengkapi sistem keamanan tingkat tinggi (JWT cookie rotation, security lockout, audit logs, 2FA) dan peramalan tren pasar.

---

## 🛠️ TECH STACK

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | Next.js 14+ (App Router) + React 18, TypeScript, Tailwind CSS, TanStack Query, Axios, Recharts (visualisasi), SheetJS (ekspor spreadsheet) |
| **Backend** | Node.js + Express.js API, TypeScript, Winston Logger, Node-cron (scheduler) |
| **Database** | MySQL 8.0, Prisma ORM |
| **Keamanan** | JWT Access (memory) + Refresh Token (httpOnly Secure cookie), Bcrypt (rounds=12), Express Rate Limiter, 2FA TOTP (Google Authenticator) |

---

## 📁 STRUKTUR FOLDER

```
/dataanalis
├── docker-compose.yml       # Orkes docker untuk DB, phpMyAdmin, API, dan Web App
├── README.md                # Panduan dokumentasi setup
├── database/                # Berkas SQL Schema DDL dan Seeding manual
│   ├── schema.sql
│   └── seed-data.sql
├── backend/                 # Layanan REST API Express.js
│   ├── src/                 # Source code TypeScript
│   ├── prisma/              # Prisma schema & seed script
│   └── Dockerfile
└── frontend/                # Aplikasi web Next.js
    ├── src/                 # Halaman App Router & Komponen
    └── Dockerfile
```

---

## 👤 AKUN LOGIN SEEDING DEFAULT

Setelah menjalankan database seeding, Anda dapat langsung mencoba login dengan akun demo berikut:

| Akun Role | Email | Password | Keterangan Akses |
|-----------|-------|----------|------------------|
| **Admin** | `admin@dataanalis.com` | `AdminPassword123!` | Akses CRUD User, Log Audit, Update Setelan, Manual Sync |
| **Analyst** | `analyst@dataanalis.com` | `AnalystPassword123!` | Akses Laporan, Tables Data, Manual Sync |
| **Viewer** | `viewer@dataanalis.com` | `ViewerPassword123!` | Hanya lihat data dan grafik (read-only) |

---

## 🚀 PETUNJUK INSTALASI & MENJALANKAN APLIKASI

### Metode 1: Menggunakan Docker Compose (Sangat Direkomendasikan)

Untuk menjalankan seluruh stack (Database MySQL, phpMyAdmin, API backend, dan Next.js frontend) dalam satu perintah:

```bash
# 1. Pastikan Anda berada di root directory project
cd dataanalis

# 2. Jalankan docker-compose
docker compose up --build -d
```

Layanan akan berjalan pada port berikut:
* **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
* **Backend API**: [http://localhost:5000](http://localhost:5000)
* **phpMyAdmin Console**: [http://localhost:8085](http://localhost:8085) (Host: `db`, User: `root`, Sandi: `dataanalis_root_password`)

---

### Metode 2: Jalankan Secara Manual (Development Mode)

#### Prasyarat
* Node.js v20+ dan npm terinstal
* Server MySQL berjalan di `localhost:3306`

#### Langkah 1: Setup Backend API
1. Buka folder backend dan instal package:
   ```bash
   cd backend
   npm install
   ```
2. Salin berkas lingkungan dan konfigurasikan koneksi MySQL Anda:
   ```bash
   cp .env.example .env
   # Buka .env lalu sesuaikan nilai DATABASE_URL, port dll
   ```
3. Lakukan migrasi database dan jalankan seeding:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```
4. Jalankan server dalam mode development:
   ```bash
   npm run dev
   ```

#### Langkah 2: Setup Frontend Web App
1. Buka folder frontend di tab terminal baru:
   ```bash
   cd frontend
   npm install
   ```
2. Jalankan server local development Next.js:
   ```bash
   npm run dev
   ```
3. Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🔗 INTEGRASI ACCURATE ONLINE & "MOCK MODE"

Aplikasi web dashboard ini mendukung koneksi langsung ke server Open API Accurate Online menggunakan standar OAuth2.

### Cara Kerja OAuth & Session di Accurate:
1. **Registrasi Aplikasi**: Daftarkan aplikasi Anda di [developer.accurate.id](https://developer.accurate.id) untuk memperoleh *Client ID* dan *Client Secret*.
2. **Koneksi Akun**: Pada halaman **Pengaturan** di dashboard, masukkan Client ID/Secret Anda dan klik **Hubungkan dengan Accurate**.
3. **Otorisasi**: Anda akan diarahkan ke halaman login Accurate. Setelah setuju, Anda akan dilempar balik ke URL setting dengan kode Callback. Salin kode callback tersebut ke input verifikasi untuk menukarkannya dengan `access_token` dan `refresh_token`.
4. **Pilih Database**: Setelah terkoneksi, daftar perusahaan Anda akan otomatis ditarik. Pilih database target untuk membuka session ID target (`open-db.do`) dan host server Accurate spesifik untuk perusahaan tersebut (Zeus, Chronos, dll).

### Mode Simulasi (Mock Mode)
Jika Anda belum memiliki kredensial developer Accurate Online, Anda tetap dapat mencoba fungsionalitas aplikasi secara menyeluruh menggunakan **Mock Mode**:
* Pastikan `ACCURATE_MOCK=true` di berkas `.env` backend.
* Klik tombol **Sync dari Accurate** di halaman tabel manapun atau jalankan sinkronisasi via pengaturan.
* Server backend akan otomatis membangkitkan data transaksi penjualan secara acak lengkap dengan log sinkronisasi operasional untuk mensimulasikan proses transfer data dari Open API Accurate ke MySQL lokal.

---

## 🔐 KONTROL KEAMANAN

* **Lockout Login**: Akun akan terkunci selama 15 menit jika gagal melakukan login sebanyak 5 kali berturut-turut.
* **TOTP 2FA**: Admin atau user dapat mengaktifkan 2FA di tab Keamanan halaman setelan. Silakan scan QR code menggunakan aplikasi Google Authenticator/Microsoft Authenticator, lalu verifikasi OTP 6-digit untuk mengaktifkan.
* **Audit Log**: Semua mutasi sistem, login berhasil/gagal, sinkronisasi modul, perubahan pengaturan, dan manipulasi user akan tercatat lengkap dengan stempel waktu, alamat IP, dan User Agent.
* **JWT Cookie Security**: Refresh Token disimpan di dalam cookie berparameter `httpOnly`, `Secure` (untuk HTTPS), dan `SameSite=Strict` guna mencegah serangan XSS dan CSRF.
