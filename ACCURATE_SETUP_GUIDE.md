# 🚀 PANDUAN LENGKAP SETUP ACCURATE ONLINE INTEGRATION

## ❌ Error yang Terjadi:
```
Ada Permasalahan
- Client ID yang digunakan tidak tepat
- URL redirect yang digunakan tidak sesuai dengan yang didaftarkan
- Scope otorisasi yang diajukan tidak tepat
```

## ✅ SOLUSI: Buat Aplikasi Baru di Accurate Developer Console

---

## 📋 STEP 1: Login ke Accurate Developer Console

1. Buka browser dan kunjungi: **https://developer.accurate.id/**
2. Klik tombol **"Login"** atau **"Masuk"**
3. Login menggunakan:
   - **Email Accurate Online** Anda
   - **Password Accurate Online** Anda
4. Jika belum punya akun Developer, daftar dulu dengan akun Accurate Online Anda

---

## 📋 STEP 2: Buat Aplikasi Baru

### **A. Akses Menu Aplikasi**
1. Setelah login, Anda akan masuk ke **Dashboard Developer**
2. Klik menu **"My Applications"** atau **"Aplikasi Saya"** di sidebar
3. Klik tombol **"Create New Application"** atau **"Buat Aplikasi Baru"**

### **B. Isi Form Aplikasi**

Isi form dengan data PERSIS seperti dibawah ini:

#### **Basic Information:**

```
Application Name: 
DataAnalis Dashboard

Application Description:
Dashboard analytics platform for sales data analysis integrated with Accurate Online

Application Type:
Web Application

Application Logo: (optional)
[Upload logo jika ada]
```

#### **OAuth Configuration:**

**⚠️ BAGIAN INI SANGAT PENTING - HARUS EXACT!**

```
Authorization Callback URLs / Redirect URIs:
https://analys.iwareid.com/settings
```

**❗ PENTING untuk Redirect URI:**
- ✅ Harus HTTPS (bukan HTTP)
- ✅ Harus lowercase semua
- ✅ Tidak ada trailing slash di akhir (/)
- ✅ Tidak ada spasi
- ✅ Exact match: `https://analys.iwareid.com/settings`

**❌ SALAH:**
```
http://analys.iwareid.com/settings     ← HTTP (bukan HTTPS)
https://analys.iwareid.com/settings/   ← Ada trailing slash
https://Analys.iwareid.com/settings    ← Huruf kapital
https://analys.iwareid.com /settings   ← Ada spasi
```

**✅ BENAR:**
```
https://analys.iwareid.com/settings
```

#### **Scopes / Permissions:**

Centang SEMUA 7 scope berikut:

```
☑ item_read              → Membaca data barang/jasa
☑ customer_read          → Membaca data pelanggan
☑ sales_invoice_read     → Membaca faktur penjualan
☑ sales_return_read      → Membaca retur penjualan
☑ report_view            → Mengakses laporan (PENTING!)
☑ work_order_read        → Membaca work order
☑ stock_mutation_read    → Membaca mutasi stok
```

**⚠️ CATATAN:** Scope `report_view` SANGAT PENTING untuk mengakses laporan detail penjualan!

### **C. Save Aplikasi**

1. Setelah semua form diisi, klik tombol **"Save"** atau **"Simpan"**
2. Aplikasi akan dibuat dengan status **"Active"**
3. Pastikan status aplikasi: **Active** (bukan Draft)

---

## 📋 STEP 3: Copy Credentials

Setelah aplikasi berhasil dibuat, Anda akan melihat:

```
═══════════════════════════════════════
APPLICATION CREDENTIALS
═══════════════════════════════════════

Client ID:
abc12345-6789-0def-ghij-klmnopqrstuv
[Copy] 

Client Secret:
1234567890abcdefghij1234567890ab
[Copy] [Show/Hide]
═══════════════════════════════════════
```

**PENTING:**
1. **Copy Client ID** - Klik tombol Copy atau select & Ctrl+C
2. **Copy Client Secret** - Klik "Show" dulu jika tersembunyi, lalu copy

⚠️ **Simpan credentials ini dengan aman!** Client Secret hanya ditampilkan sekali.

---

## 📋 STEP 4: Update Credentials di VPS

Sekarang kita update credentials baru di server.

### **Opsi A: Menggunakan Script Otomatis (RECOMMENDED)**

SSH ke VPS dan jalankan script:

```bash
ssh root@145.79.8.148

# Jalankan script update
sudo /usr/local/bin/update-env-accurate.sh <CLIENT_ID_BARU> <CLIENT_SECRET_BARU>
```

**Contoh:**
```bash
sudo /usr/local/bin/update-env-accurate.sh abc12345-6789-0def-ghij-klmnopqrstuv 1234567890abcdefghij1234567890ab
```

Script akan otomatis:
- ✅ Update file `.env`
- ✅ Restart backend container
- ✅ Tampilkan konfigurasi baru

### **Opsi B: Manual Edit**

Jika script tidak ada atau ingin manual:

```bash
# 1. SSH ke VPS
ssh root@145.79.8.148

# 2. Edit file .env
cd /opt/analis
nano .env

# 3. Update baris berikut dengan credentials BARU:
ACCURATE_CLIENT_ID=<paste_client_id_baru_disini>
ACCURATE_CLIENT_SECRET=<paste_client_secret_baru_disini>

# 4. Save file (Ctrl+O, Enter, Ctrl+X)

# 5. Restart backend container
docker compose restart dataanalis-backend

# 6. Verifikasi
cat .env | grep ACCURATE
```

---

## 📋 STEP 5: Test Integrasi

Sekarang test OAuth flow:

### **A. Akses Aplikasi**
1. Buka browser: **https://analys.iwareid.com**
2. Login dengan:
   - Email: `admin@iware.id`
   - Password: `jasad666`

### **B. Koneksi ke Accurate**
1. Klik menu **"Settings"** di sidebar kiri
2. Tab **"Integrasi Accurate Online"** akan terbuka
3. Klik tombol **"Hubungkan ke Accurate"**

### **C. Authorize Aplikasi**
1. Anda akan diredirect ke **Accurate OAuth Page**
2. **Login** dengan akun Accurate Online Anda (jika belum login)
3. Anda akan melihat halaman **"Berikan Izin"** dengan daftar permissions
4. Klik tombol **"Izinkan"** atau **"Allow"**

### **D. Verifikasi Berhasil**
Setelah klik "Izinkan", Anda akan:
1. ✅ Diredirect kembali ke halaman Settings
2. ✅ Melihat notifikasi: "Berhasil terhubung ke Accurate Online"
3. ✅ Melihat dropdown **"Pilih Database"** dengan daftar database perusahaan Anda
4. ✅ Pilih database → Klik "Pilih Database"
5. ✅ Tombol **"Sync Data"** akan aktif

### **E. Test Sync Data**
1. Pilih modul: **"Barang & Jasa"**
2. Klik tombol **"Sync"**
3. Tunggu proses sync selesai
4. ✅ Jika berhasil, Anda akan melihat notifikasi: "Sinkronisasi berhasil"
5. ✅ Data akan muncul di menu **"Barang & Jasa"** di sidebar

---

## 🔍 TROUBLESHOOTING

### ❌ Error: "Client ID tidak tepat"

**Penyebab:**
- Client ID yang Anda masukkan tidak terdaftar di Accurate Developer Console
- Copy-paste tidak lengkap (ada spasi atau karakter kurang)

**Solusi:**
1. Buka Accurate Developer Console
2. Cek Client ID di halaman aplikasi Anda
3. Copy ulang dengan hati-hati (pastikan tidak ada spasi)
4. Update di VPS dengan script atau manual edit

### ❌ Error: "URL redirect tidak sesuai"

**Penyebab:**
- Redirect URI di Accurate Developer Console tidak exact match
- Ada typo (huruf kapital, trailing slash, spasi, dll)

**Solusi:**
1. Buka Accurate Developer Console
2. Edit aplikasi
3. Pastikan Redirect URI persis: `https://analys.iwareid.com/settings`
4. Save aplikasi
5. Test lagi

### ❌ Error: "Scope tidak tepat"

**Penyebab:**
- Ada scope yang tidak dicentang di Accurate Developer Console
- Scope `report_view` tidak aktif

**Solusi:**
1. Buka Accurate Developer Console
2. Edit aplikasi
3. Centang SEMUA 7 scope yang dibutuhkan
4. Save aplikasi
5. Test lagi

### ❌ Error: "Application is not active"

**Penyebab:**
- Aplikasi masih dalam status Draft

**Solusi:**
1. Buka Accurate Developer Console
2. Edit aplikasi
3. Pastikan status: **Active**
4. Jika masih Draft, ubah ke Active dan save

### ❌ Redirect loop atau blank page

**Penyebab:**
- DNS tidak resolve atau SSL certificate bermasalah
- Frontend tidak bisa komunikasi dengan backend

**Solusi:**
1. Test DNS: `nslookup analys.iwareid.com`
2. Test SSL: Buka `https://analys.iwareid.com` di browser (pastikan hijau)
3. Test backend: `curl https://analys.iwareid.com/api/health`
4. Cek Nginx logs: `sudo tail -f /var/log/nginx/dataanalis_error.log`

---

## 📊 CHECKLIST LENGKAP

Gunakan checklist ini untuk memastikan semua setup benar:

### ✅ Di Accurate Developer Console:
- [ ] Login berhasil ke https://developer.accurate.id/
- [ ] Aplikasi sudah dibuat dengan nama "DataAnalis Dashboard"
- [ ] Redirect URI: `https://analys.iwareid.com/settings` (EXACT)
- [ ] Semua 7 scope sudah dicentang
- [ ] Application Status: **Active** (bukan Draft)
- [ ] Client ID dan Client Secret sudah dicopy

### ✅ Di VPS Server:
- [ ] SSH ke server berhasil
- [ ] File `/opt/analis/.env` sudah di-update dengan credentials baru
- [ ] `ACCURATE_CLIENT_ID` sudah benar
- [ ] `ACCURATE_CLIENT_SECRET` sudah benar
- [ ] `ACCURATE_REDIRECT_URI=https://analys.iwareid.com/settings`
- [ ] Backend container sudah di-restart
- [ ] Test: `cat /opt/analis/.env | grep ACCURATE` tampilkan config yang benar

### ✅ Di Aplikasi Web:
- [ ] Browser bisa akses https://analys.iwareid.com
- [ ] SSL certificate hijau (tidak ada warning)
- [ ] Login berhasil dengan admin@iware.id
- [ ] Halaman Settings bisa dibuka
- [ ] Tombol "Hubungkan ke Accurate" ada dan bisa diklik

### ✅ OAuth Flow:
- [ ] Klik "Hubungkan ke Accurate" redirect ke Accurate OAuth page
- [ ] Halaman OAuth Accurate tampil (bukan error 401/403/404)
- [ ] Login Accurate berhasil (jika diminta)
- [ ] Halaman "Berikan Izin" tampil dengan list permissions
- [ ] Klik "Izinkan" redirect kembali ke Settings
- [ ] Notifikasi "Berhasil terhubung" muncul
- [ ] Dropdown database muncul
- [ ] Bisa pilih database dan klik "Pilih Database"
- [ ] Tombol Sync aktif

---

## 🎯 QUICK REFERENCE

**Accurate Developer Console:**
https://developer.accurate.id/

**Redirect URI (Exact Match):**
```
https://analys.iwareid.com/settings
```

**Required Scopes:**
```
item_read
customer_read
sales_invoice_read
sales_return_read
report_view
work_order_read
stock_mutation_read
```

**Update Script Location:**
```bash
/usr/local/bin/update-env-accurate.sh
```

**Environment File Location:**
```bash
/opt/analis/.env
```

**Test Backend Health:**
```bash
curl https://analys.iwareid.com/api/health
```

**View Backend Logs:**
```bash
cd /opt/analis
docker compose logs -f dataanalis-backend
```

---

## 💡 TIPS

1. **Simpan Credentials dengan Aman**
   - Jangan share Client Secret ke publik
   - Simpan di password manager

2. **Test di Incognito/Private Mode**
   - Untuk memastikan tidak ada cache issue
   - Clear cookies Accurate jika ada masalah

3. **Gunakan Akun Accurate yang Benar**
   - Pastikan akun Accurate yang digunakan punya akses ke database yang ingin disync
   - Akun harus punya permission untuk akses API

4. **Monitoring**
   - Cek sync logs secara berkala di menu Settings
   - Monitor error logs jika sync gagal

---

**Created:** 18 Juni 2026  
**Last Updated:** 18 Juni 2026  
**Status:** Production Ready  
**Version:** 1.0
