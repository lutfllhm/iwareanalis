# 🔧 TROUBLESHOOTING: INTEGRASI ACCURATE ONLINE

## ❌ Error: "Ada Permasalahan" saat OAuth

### **Penyebab Error:**
Error ini muncul karena salah satu dari:
1. **Client ID tidak tepat** - Client ID di aplikasi tidak sesuai dengan yang didaftarkan di Accurate
2. **Redirect URI tidak sesuai** - URL redirect tidak sama persis dengan yang didaftarkan
3. **Scope tidak sesuai** - Scope yang diminta tidak diizinkan di aplikasi

---

## ✅ SOLUSI LENGKAP

### **STEP 1: Setup Aplikasi di Accurate Developer Console**

1. **Login ke Developer Console:**
   - URL: https://developer.accurate.id/
   - Login dengan akun Accurate Online Anda

2. **Buka/Buat Aplikasi:**
   - Jika sudah ada aplikasi dengan Client ID: `1be820dc-c25a-43b7-8494-040830235d68`
     → Klik **Edit** pada aplikasi tersebut
   - Jika belum ada → Klik **"Create New App"**

3. **Konfigurasi Aplikasi:**

```
═══════════════════════════════════════════════════════════
APPLICATION CONFIGURATION
═══════════════════════════════════════════════════════════

Application Name:
  DataAnalis Dashboard

Description:
  Dashboard analytics platform integrated with Accurate Online

Redirect URIs: (⚠️ HARUS EXACT MATCH)
  https://analys.iwareid.com/settings

⚠️ PENTING: 
  - Harus https:// (bukan http://)
  - Harus exact match dengan path /settings
  - Tidak ada trailing slash (/)
  - Tidak ada spasi di awal/akhir

Allowed Scopes: (Centang SEMUA ini)
  ✅ item_read              → Baca daftar barang/jasa
  ✅ customer_read          → Baca daftar pelanggan  
  ✅ sales_invoice_read     → Baca faktur penjualan
  ✅ sales_return_read      → Baca retur penjualan
  ✅ report_view            → Akses laporan (PENTING!)
  ✅ work_order_read        → Baca work order
  ✅ stock_mutation_read    → Baca mutasi stok

═══════════════════════════════════════════════════════════
```

4. **Simpan dan Copy Credentials:**
   - Klik **Save**
   - Copy **Client ID** dan **Client Secret**

---

### **STEP 2: Verifikasi Credentials di VPS**

Login ke VPS dan cek konfigurasi:

```bash
ssh root@145.79.8.148
cd /opt/analis
cat .env | grep ACCURATE
```

**Output harus menunjukkan:**
```env
ACCURATE_MOCK=false
ACCURATE_CLIENT_ID=<your_client_id_here>
ACCURATE_CLIENT_SECRET=<your_client_secret_here>
ACCURATE_REDIRECT_URI=https://analys.iwareid.com/settings
```

**Jika Client ID/Secret berbeda dengan yang di Accurate Developer Console:**

Edit file `.env`:
```bash
nano .env
```

Update baris berikut dengan credentials yang benar:
```env
ACCURATE_CLIENT_ID=<client_id_from_accurate>
ACCURATE_CLIENT_SECRET=<client_secret_from_accurate>
```

Save (Ctrl+O, Enter, Ctrl+X)

Restart backend:
```bash
docker compose restart dataanalis-backend
```

---

### **STEP 3: Test OAuth Flow Lagi**

1. Buka browser: https://analys.iwareid.com
2. Login dengan admin@iware.id / jasad666
3. Klik menu **Settings** di sidebar
4. Klik tombol **"Hubungkan ke Accurate"**
5. Anda akan diredirect ke Accurate OAuth page
6. **Jika masih error** → lanjut ke STEP 4

---

### **STEP 4: Debug OAuth URL**

Jika masih error, kita perlu melihat OAuth URL yang di-generate oleh backend.

**Cara 1: Lihat di Browser Network Tab**

1. Buka browser DevTools (F12)
2. Tab **Network**
3. Klik tombol "Hubungkan ke Accurate"
4. Lihat request ke `/api/sync/connect`
5. Copy `authUrl` dari response
6. Paste URL di notepad dan decode

**Cara 2: Test Langsung via cURL**

Login dulu untuk mendapatkan token:

```bash
# 1. Login dan simpan response
curl -X POST https://analys.iwareid.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iware.id","password":"jasad666"}' \
  -c cookies.txt \
  > login_response.json

# 2. Extract access token
cat login_response.json

# 3. Request OAuth URL dengan token
curl https://analys.iwareid.com/api/sync/connect \
  -H "Authorization: Bearer <your_access_token_here>" \
  -b cookies.txt
```

**OAuth URL yang benar harus seperti ini:**

```
https://account.accurate.id/oauth/authorize?client_id=1be820dc-c25a-43b7-8494-040830235d68&response_type=code&redirect_uri=https%3A%2F%2Fanalys.iwareid.com%2Fsettings&scope=item_read%20customer_read%20sales_invoice_read%20sales_return_read%20report_view%20work_order_read%20stock_mutation_read
```

**Decode URL untuk verifikasi:**
- client_id: `1be820dc-c25a-43b7-8494-040830235d68`
- redirect_uri: `https://analys.iwareid.com/settings`
- scope: `item_read customer_read sales_invoice_read sales_return_read report_view work_order_read stock_mutation_read`

---

### **STEP 5: Checklist Troubleshooting**

Pastikan SEMUA ini benar:

#### ✅ Di Accurate Developer Console:
- [ ] Aplikasi sudah dibuat/diedit
- [ ] Client ID cocok dengan yang di `.env`
- [ ] Redirect URI: `https://analys.iwareid.com/settings` (exact match)
- [ ] Semua 7 scope sudah dicentang (item_read, customer_read, dll)
- [ ] Aplikasi status: **Active** (bukan Draft)

#### ✅ Di VPS .env file:
- [ ] `ACCURATE_MOCK=false`
- [ ] `ACCURATE_CLIENT_ID` sama dengan di Developer Console
- [ ] `ACCURATE_CLIENT_SECRET` sama dengan di Developer Console  
- [ ] `ACCURATE_REDIRECT_URI=https://analys.iwareid.com/settings`
- [ ] Backend container sudah di-restart setelah edit .env

#### ✅ Di Domain & SSL:
- [ ] DNS `analys.iwareid.com` mengarah ke 145.79.8.148
- [ ] SSL certificate valid (HTTPS hijau di browser)
- [ ] Nginx berjalan dan proxy ke port 3010/5010

---

## 🔍 ERROR LAINNYA

### Error: "Redirect URI Mismatch"

**Penyebab:** Redirect URI di request tidak sama dengan yang didaftarkan

**Solusi:**
1. Cek redirect URI di Accurate Developer Console
2. Harus exact match: `https://analys.iwareid.com/settings`
3. Tidak boleh ada trailing slash atau parameter tambahan

### Error: "Invalid Client"

**Penyebab:** Client ID salah atau aplikasi tidak aktif

**Solusi:**
1. Verifikasi Client ID di Developer Console
2. Pastikan aplikasi status: Active
3. Update Client ID di `.env` jika berbeda

### Error: "Scope Not Allowed"

**Penyebab:** Scope yang diminta tidak diizinkan di aplikasi

**Solusi:**
1. Buka aplikasi di Developer Console
2. Centang semua scope yang dibutuhkan:
   - item_read, customer_read, sales_invoice_read
   - sales_return_read, report_view, work_order_read
   - stock_mutation_read
3. Save aplikasi

---

## 📞 Masih Bermasalah?

### **Opsi 1: Buat Aplikasi Baru di Accurate**

Jika aplikasi lama rusak, buat aplikasi baru:

1. Login ke https://developer.accurate.id/
2. Create New App
3. Isi konfigurasi seperti di STEP 1
4. Copy Client ID & Secret yang baru
5. Update di VPS `.env`
6. Restart backend

### **Opsi 2: Cek Log Backend**

```bash
ssh root@145.79.8.148
cd /opt/analis
docker compose logs -f dataanalis-backend
```

Cari error message terkait OAuth/Accurate

### **Opsi 3: Test dengan Mock Mode**

Sementara troubleshoot, gunakan mock mode:

```bash
nano /opt/analis/.env
# Ubah:
ACCURATE_MOCK=true

# Restart:
docker compose restart dataanalis-backend
```

Dengan mock mode, integrasi akan menggunakan data dummy tanpa koneksi ke Accurate.

---

## ✅ Verifikasi Integrasi Berhasil

Setelah OAuth berhasil, Anda akan:

1. **Diredirect kembali ke Settings page**
2. **Melihat pesan sukses:** "Berhasil terhubung ke Accurate Online"
3. **Muncul pilihan database** Accurate yang tersedia
4. **Pilih database** → Klik "Pilih Database"
5. **Tombol Sync** menjadi aktif
6. **Test sync modul** → Pilih "Barang & Jasa" → Klik Sync
7. **Lihat hasil sync** di tabel data atau sync logs

---

## 📋 Quick Reference

**Accurate Developer Console:**
https://developer.accurate.id/

**Redirect URI yang benar:**
```
https://analys.iwareid.com/settings
```

**Scope yang dibutuhkan:**
```
item_read customer_read sales_invoice_read sales_return_read report_view work_order_read stock_mutation_read
```

**VPS Environment File:**
```bash
/opt/analis/.env
```

**Restart Backend:**
```bash
cd /opt/analis && docker compose restart dataanalis-backend
```

---

**Last Updated:** 18 Juni 2026  
**Status:** Production Ready
