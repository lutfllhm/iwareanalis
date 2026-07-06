# 🔧 TROUBLESHOOTING: INTEGRASI ACCURATE ONLINE (Skema API Token)

Aplikasi ini menggunakan skema **API Token** Accurate Online (App Key +
Signature Secret + API Token + header HMAC-SHA256), bukan OAuth. Jika Anda
mencari error terkait `client_id`/`redirect_uri`/OAuth authorize page, itu
tidak berlaku untuk versi kode saat ini — lihat ACCURATE_SETUP_GUIDE.md untuk
alur yang benar.

---

## 📚 Daftar Endpoint Resmi yang Dipakai (vs yang TIDAK ada)

Referensi lengkap endpoint Accurate ada di halaman
`https://account.accurate.id/developer/api-docs.do` (menu Area Developer →
Daftar API). Endpoint di dalam `/api/report/` yang **benar-benar ada** per
pengecekan langsung ke halaman tersebut:

| Endpoint | Method | Parameter wajib |
|---|---|---|
| `/api/report/serial-number-mutation.do` | GET | `itemNo` |
| `/api/report/serial-number-per-warehouse.do` | GET | `itemNo` |
| `/api/report/stock-mutation-summary.do` | GET | `itemNo`, `fromDate`, `toDate` |
| `/api/report/work-order-detail.do` | GET | `workOrderNo` |

Endpoint berikut **tidak ada** di Daftar API resmi dan sempat salah dipakai
di kode versi lama (sudah diperbaiki):
- `/api/report/get-sales-per-item.do` — dulu dipakai untuk sync "Rincian
  Penjualan per Barang". Sekarang datanya diturunkan dari `detailList` pada
  `/api/sales-invoice/list.do` (endpoint resmi, ada di Daftar API).
- `/api/report/sales-invoice-list.do` — dulu dipakai untuk sync "Daftar
  Faktur Penjualan". Sekarang langsung memakai `/api/sales-invoice/list.do`.

Jika sync gagal dengan pesan 404/"endpoint not found" untuk modul manapun,
kemungkinan besar penyebabnya sama: path endpoint yang dipanggil tidak ada
di Daftar API resmi Accurate. Selalu verifikasi nama path di halaman
`account.accurate.id/developer/api-docs.do` sebelum menambah puller baru.

---

## ❌ Error: "Sesi Accurate telah berakhir. Silakan hubungkan ulang di halaman Pengaturan." (HTTP 401)

### Penyebab paling umum:
1. **API Token sudah dihapus/direvoke** di Accurate Store → API Token (mis.
   karena diklik "Hapus", atau dibuat ulang oleh user lain sehingga token lama
   invalid).
2. **Signature Secret salah** — nilainya harus App Secret dari aplikasi
   Developer yang App Key-nya dipakai untuk install, BUKAN password akun
   Accurate atau Client Secret OAuth lama.
3. **App Key tidak cocok** dengan aplikasi yang API Token-nya dibuat.
4. Jam server backend melenceng jauh dari waktu Accurate (lihat error
   timestamp di bawah) — request ditolak karena timestamp invalid, yang juga
   bisa muncul sebagai 401.

### Solusi:
1. Buka **Pengaturan → Koneksi Accurate Online** di aplikasi ini, klik tombol
   **Test Koneksi**. Pesan error yang muncul sekarang menyertakan detail asli
   dari Accurate (bukan cuma "sesi berakhir" generik) — baca pesan tersebut
   dulu untuk tahu apakah ini soal token, signature, atau timestamp.
2. Jika token memang sudah tidak valid: login ke **accurate.id** → Pengaturan
   → Accurate Store → tab **API Token** → buat token baru (token lama otomatis
   tergantikan untuk kombinasi user + aplikasi yang sama).
3. Masukkan ulang **App Key**, **Signature Secret**, **API Token** yang baru di
   halaman Pengaturan aplikasi ini, klik **Simpan & Hubungkan dengan Accurate**.
4. Cek log backend untuk detail teknis:
   ```bash
   ssh root@145.79.8.148
   cd /opt/analis
   docker compose logs -f dataanalis-backend
   ```

---

## ❌ Error: "Header X-Api-Signature invalid"

**Penyebab:** Signature Secret yang tersimpan salah, sehingga hasil
HMAC-SHA256 dari timestamp tidak cocok dengan yang diharapkan Accurate.

**Solusi:** Ambil ulang Signature Secret (App Secret) dari halaman aplikasi di
https://developer.accurate.id/, pastikan tidak ada spasi/karakter terpotong
saat disalin, lalu simpan ulang di halaman Pengaturan.

---

## ❌ Error: "Header X-Api-Timestamp invalid" / "difference more than 600 seconds with Server Time"

**Penyebab:** Format timestamp salah, atau jam server (VPS) yang menjalankan
backend berbeda lebih dari 10 menit dari waktu Accurate. Backend mengirim
timestamp dalam zona `Asia/Jakarta` format `dd/mm/yyyy hh:nn:ss`.

**Solusi:**
```bash
ssh root@145.79.8.148
date                     # cek jam server saat ini
timedatectl               # pastikan NTP sync aktif (systemd)
sudo timedatectl set-ntp true
```
Setelah jam server benar, coba **Test Koneksi** lagi di halaman Pengaturan.

---

## ❌ Error: "API Token belum dikonfigurasi. Silakan hubungkan akun Accurate terlebih dahulu di halaman Pengaturan."

**Penyebab:** Salah satu dari App Key / Signature Secret / API Token masih
kosong di database (belum pernah diisi, atau gagal tersimpan).

**Solusi:** Isi ketiga field di halaman Pengaturan → Koneksi Accurate Online,
lalu klik **Simpan & Hubungkan dengan Accurate**.

---

## ❌ Aplikasi tidak muncul saat "Buat API Token" di Accurate Store

**Penyebab:** Aplikasi Developer belum di-Install ke Data Usaha tersebut.

**Solusi:** Ikuti STEP 2 di ACCURATE_SETUP_GUIDE.md (Install Aplikasi lewat
Accurate Store → Aplikasi Saya → App Key) sebelum membuat API Token.

---

## 🧪 Cara Cepat Cek Status Koneksi

1. **Dari UI:** Pengaturan → Koneksi Accurate Online → tombol **Test Koneksi**
   (tersedia setelah pernah berhasil connect sekali). Ini memanggil ulang
   `/api/api-token.do` dengan kredensial yang sudah tersimpan, tanpa perlu
   isi ulang form.
2. **Dari API langsung:**
   ```bash
   curl -X POST https://analys.iwareid.com/api/sync/test-connection \
     -H "Authorization: Bearer <access_token_login_anda>"
   ```
3. **Mode mock (sementara, tanpa koneksi Accurate):**
   ```bash
   nano /opt/analis/.env
   # ACCURATE_MOCK=true
   docker compose restart dataanalis-backend
   ```

---

## 📋 Quick Reference

**Buat/kelola App Key & Signature Secret:** https://developer.accurate.id/
**Install Aplikasi & Buat API Token:** accurate.id → Pengaturan → Accurate Store
**Endpoint verifikasi token:** `POST https://account.accurate.id/api/api-token.do`
**VPS Environment File:** `/opt/analis/.env`
**Restart Backend:** `cd /opt/analis && docker compose restart dataanalis-backend`
**Kontak resmi Accurate untuk isu API Token:** aol-integration@cpssoft.com

---

**Last Updated:** 06 Juli 2026
**Status:** Sesuai implementasi kode saat ini (skema API Token, bukan OAuth)
