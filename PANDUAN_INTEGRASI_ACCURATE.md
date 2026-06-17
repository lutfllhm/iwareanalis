# 🔗 Panduan Lengkap Integrasi Accurate Online

## ✅ Update Terbaru
- ✅ Menu "Daftar Laporan" sudah dihapus dari navigasi
- ✅ OAuth scope sudah disesuaikan untuk READ ONLY access
- ✅ Redirect URI sudah dikonfigurasi ke backend endpoint
- ✅ Manual callback endpoint sudah tersedia

---

## 📋 Prerequisites

1. **Akun Accurate Online** yang aktif
2. **Client ID** dan **Client Secret** dari Accurate Developer Console
3. Akses **Admin** di aplikasi Data Analis

---

## 🚀 LANGKAH SETUP INTEGRASI

### **STEP 1: Setup di Accurate Developer Console**

1. Login ke [Accurate Developer Console](https://account.accurate.id/developer)
2. Klik **"Create New Application"** atau pilih aplikasi yang sudah ada
3. Isi detail aplikasi:
   - **Application Name**: Data Analis Integration
   - **Description**: Integrasi untuk analisis data penjualan
   
4. **REDIRECT URI** (sangat penting!):
   ```
   http://145.79.8.148:5010/api/sync/callback
   ```
   ⚠️ Harus **exact match** - tidak boleh ada trailing slash atau perbedaan apapun

5. **Scope/Permissions** yang dibutuhkan:
   ```
   item_read
   customer_read
   sales_invoice_read
   sales_return_read
   report_view
   work_order_read
   stock_mutation_read
   ```
   Semua scope di atas adalah **READ ONLY** - aplikasi tidak akan mengubah data di Accurate

6. Setelah save, catat:
   - ✅ **Client ID**: `xxxxx-xxxx-xxxx-xxxx-xxxxx`
   - ✅ **Client Secret**: `xxxxxxxxxxxxxxxxxxxxxx`

---

### **STEP 2: Input Credentials di Aplikasi**

1. Buka aplikasi: [http://145.79.8.148:3010](http://145.79.8.148:3010)
2. Login sebagai **Admin**
3. Klik menu **"Pengaturan"** (Settings) di sidebar
4. Tab **"Koneksi Accurate Online"**

5. Masukkan credentials:
   - **Client ID**: [paste dari developer console]
   - **Client Secret**: [paste dari developer console]

6. Klik tombol **"Simpan Kredensial"**
   - Jika berhasil, akan muncul notifikasi hijau

---

### **STEP 3: Hubungkan dengan Accurate (OAuth)**

1. Setelah kredensial tersimpan, klik tombol **"Hubungkan dengan Accurate"**
2. Browser akan membuka **tab/window baru** dengan halaman OAuth Accurate
3. **Login** dengan akun Accurate Online Anda (jika belum login)
4. Review permissions yang diminta:
   ```
   Aplikasi ini meminta izin untuk:
   ✅ Membaca data barang dan jasa
   ✅ Membaca data pelanggan
   ✅ Membaca faktur penjualan
   ✅ Membaca retur penjualan
   ✅ Melihat laporan
   ✅ Membaca work order
   ✅ Membaca mutasi stok
   ```
5. Klik **"Setujui"** / **"Allow"** / **"Authorize"**

---

### **STEP 4: Verifikasi OAuth Code**

Setelah approve, ada 2 kemungkinan:

#### **Opsi A: Automatic Redirect (Berhasil)**
- Anda akan otomatis di-redirect kembali ke halaman Settings
- URL akan berubah jadi: `http://145.79.8.148:3010/settings?accurate_connected=true`
- List database perusahaan akan muncul otomatis

#### **Opsi B: Manual Input (Jika Redirect Gagal)**

Jika redirect tidak berhasil, Anda akan melihat error "Ada Permasalahan" atau browser stuck di halaman Accurate.

**Solusi Manual:**

1. Lihat URL bar browser Anda setelah klik "Setujui"
2. URL akan berisi parameter `code`:
   ```
   http://145.79.8.148:5010/api/sync/callback?code=a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

3. **Copy** hanya bagian `code` (contoh: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

4. Kembali ke halaman Settings aplikasi

5. Pada form **"Verifikasi Callback Otorisasi"**:
   - Paste code yang sudah di-copy
   - Klik tombol **"Proses Token"**

6. Jika berhasil:
   - Notifikasi hijau: "Berhasil terhubung ke Accurate!"
   - List database perusahaan akan muncul

---

### **STEP 5: Pilih Database Perusahaan**

1. Setelah koneksi berhasil, akan muncul daftar database perusahaan Anda
2. Contoh:
   ```
   ┌─────────────────────────┐
   │ PT. Maju Bersama        │
   │ ID DB: 12345            │
   └─────────────────────────┘
   
   ┌─────────────────────────┐
   │ CV. Sejahtera Jaya      │
   │ ID DB: 67890            │
   └─────────────────────────┘
   ```

3. **Klik** pada database yang ingin digunakan
4. Tunggu konfirmasi: "Berhasil membuka database [Nama Perusahaan]"

✅ **Setup selesai!** Koneksi ke Accurate sudah aktif.

---

## 🔄 CARA SINKRONISASI DATA

Setelah koneksi berhasil, Anda bisa sync data dari Accurate ke aplikasi.

### **Menu Dashboard → Sinkronisasi Manual**

1. Buka menu **"Dashboard"**
2. Scroll ke bagian **"Sinkronisasi Data"**
3. Pilih modul yang ingin di-sync:
   
   - ✅ **Barang & Jasa** - Daftar produk/item
   - ✅ **Pelanggan** - Data customer
   - ✅ **Faktur Penjualan** - Invoice penjualan (include detail items)
   - ✅ **Retur Penjualan** - Return/retur barang
   - ✅ **Rincian Penjualan Barang** - Laporan detail per item (dari Report API)
   - ✅ **Mutasi Serial Number** - Tracking serial number
   - ✅ **Ringkasan Mutasi Stok** - Stock movement summary
   - ✅ **Work Order** - Produksi/manufacturing

4. Klik tombol **"Sync"** di modul yang diinginkan
5. Progress akan ditampilkan
6. Notifikasi akan muncul ketika sync selesai

### **Sync Otomatis (Cron Job)**

Di halaman **Settings → Tab "Koneksi Accurate Online"**, Anda bisa mengatur jadwal sync otomatis:

- **Setiap 1 Jam**: `0 */1 * * *`
- **Setiap 4 Jam (Default)**: `0 */4 * * *`
- **Setiap Tengah Malam**: `0 0 * * *`

Atau custom sesuai kebutuhan menggunakan cron expression.

---

## 📊 MENGGUNAKAN DATA YANG SUDAH DI-SYNC

Setelah sinkronisasi berhasil, data bisa dilihat di menu:

- **Daftar Barang & Jasa**: `/barang-jasa`
- **Daftar Pelanggan**: `/pelanggan`
- **Faktur Penjualan**: `/faktur-penjualan`
- **Rincian Penjualan**: `/rincian-penjualan`
- **Retur Penjualan**: `/retur-penjualan`
- **Laporan Data Analyst**: `/laporan` (grafik dan analisis lengkap)

Semua menu support:
- 🔍 Search & Filter
- 📄 Pagination
- 📥 Download CSV (untuk Admin/Analyst)
- 📊 Export ke Excel

---

## ⚠️ TROUBLESHOOTING

### **1. Error "Ada Permasalahan" saat OAuth**

**Kemungkinan penyebab:**
- ❌ Client ID atau Secret salah
- ❌ Redirect URI tidak exact match
- ❌ Scope tidak sesuai

**Solusi:**
1. Cek kembali Client ID dan Secret di [Developer Console](https://account.accurate.id/developer)
2. Pastikan Redirect URI **exact match**: `http://145.79.8.148:5010/api/sync/callback`
3. Hapus aplikasi lama dan buat baru jika perlu

---

### **2. Redirect Gagal Setelah Approve**

**Solusi:** Gunakan **Manual Input Code** (lihat Step 4 Opsi B)

---

### **3. "Access token not available" saat Sync**

**Penyebab:** Token expired atau belum authorize

**Solusi:**
1. Kembali ke Settings
2. Klik "Hubungkan dengan Accurate" lagi
3. Ulangi proses OAuth

---

### **4. Sync Gagal untuk Modul Tertentu**

**Cek logs backend:**
```bash
ssh root@145.79.8.148
docker logs dataanalis_backend --tail 100
```

Lihat error message detail untuk troubleshooting.

---

### **5. Database List Tidak Muncul**

**Solusi:**
1. Pastikan token sudah di-exchange (cek Step 4)
2. Reload halaman Settings
3. Atau manual fetch dengan klik "Hubungkan dengan Accurate" lagi

---

## 🔒 KEAMANAN

1. **Token Encryption**: Semua access token dan refresh token di-encrypt sebelum disimpan di database
2. **READ ONLY**: Aplikasi hanya membaca data, tidak mengubah data di Accurate
3. **HTTPS**: Untuk production, sebaiknya gunakan HTTPS dengan SSL certificate
4. **2FA Support**: Aplikasi support Two-Factor Authentication untuk keamanan tambahan

---

## 📞 SUPPORT

Jika mengalami kendala:

1. **Cek Backend Logs**:
   ```bash
   ssh root@145.79.8.148
   docker logs dataanalis_backend --tail 100
   ```

2. **Cek Frontend Logs**:
   ```bash
   docker logs dataanalis_frontend --tail 50
   ```

3. **Restart Service** (jika diperlukan):
   ```bash
   cd /opt/analis
   docker compose restart backend frontend
   ```

---

## 📚 DOKUMENTASI API ACCURATE

Referensi lengkap: [Accurate API Documentation](https://accurate.id/api-documentation)

**Endpoint yang digunakan:**
- `GET /api/db-list.do` - List database
- `GET /api/open-db.do` - Open database session
- `POST /api/item/list.do` - Barang & Jasa
- `POST /api/customer/list.do` - Pelanggan
- `POST /api/sales-invoice/list.do` - Faktur Penjualan
- `POST /api/sales-return/list.do` - Retur Penjualan
- `GET /api/report/get-sales-per-item.do` - Rincian Penjualan per Barang
- Dan lain-lain

---

**Selamat menggunakan! 🎉**
