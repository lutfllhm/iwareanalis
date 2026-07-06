# 🚀 PANDUAN LENGKAP SETUP INTEGRASI ACCURATE ONLINE

Aplikasi ini terhubung ke Accurate Online menggunakan skema resmi **API Token**
(App Key + Signature Secret + API Token), sesuai dokumentasi
`Integrasi API Accurate Online dengan API Token v1.0.3`. Skema ini **bukan**
OAuth (tidak ada Client ID/Client Secret/redirect URI/scope authorize).

---

## 📋 STEP 1: Buat Aplikasi Developer & Dapatkan App Key

1. Buka **https://developer.accurate.id/** dan login dengan akun Accurate Online.
2. Buat aplikasi baru (atau gunakan aplikasi yang sudah ada) di Area Developer.
3. Catat **App Key** aplikasi tersebut — nilai ini yang dimasukkan di halaman
   Pengaturan aplikasi ini (field "App Key").

---

## 📋 STEP 2: Install Aplikasi ke Data Usaha Accurate

1. Login ke **https://accurate.id** dengan akun yang punya akses ke Data Usaha
   yang ingin diintegrasikan, lalu masuk ke Data Usaha tersebut.
2. Buka menu **Pengaturan → Accurate Store → Aplikasi Saya**.
3. Klik **Install Aplikasi**, lalu masukkan **App Key** dari Step 1.
4. Setujui syarat & ketentuan/biaya (jika ada), klik **Install**.

> Hanya user dengan Hak Akses **Administrator** pada Data Usaha yang bisa
> melakukan Install Aplikasi.

---

## 📋 STEP 3: Buat API Token

1. Masih di **Pengaturan → Accurate Store**, buka tab **API Token**.
2. Klik **Buat API Token**, pilih aplikasi yang sudah di-install pada Step 2.
3. Centang **"Saya telah Membaca dan Setuju dengan Syarat dan Ketentuan API Token"**,
   lalu klik **Buat Token**.
4. Salin nilai **API Token** yang ditampilkan (JWT panjang, hanya tampil di sini).

> User dengan Hak Akses **Administrator** maupun **Operator** dapat membuat
> API Token, dan bisa berbeda dengan user yang melakukan Install Aplikasi.
> Satu user hanya bisa punya satu API Token aktif per aplikasi per Data Usaha.

---

## 📋 STEP 4: Dapatkan Signature Secret

**Signature Secret** adalah App Secret dari aplikasi Developer yang dibuat di
Step 1 (dipakai untuk menandatangani header `X-Api-Signature` dengan
HMAC-SHA256). Ambil nilai ini dari halaman detail aplikasi di
**https://developer.accurate.id/**, di sebelah App Key.

⚠️ Jangan gunakan Client Secret dari skema OAuth lama — App Key/Signature
Secret dan Client ID/Client Secret adalah pasangan kredensial yang berbeda.

---

## 📋 STEP 5: Masukkan Kredensial di Aplikasi Ini

1. Buka aplikasi ini, login sebagai admin.
2. Buka menu **Pengaturan** → tab **Koneksi Accurate Online**.
3. Isi 3 field berikut persis dari Step 1–4:
   - **App Key**
   - **Signature Secret**
   - **API Token**
4. Klik **Simpan & Hubungkan dengan Accurate**.

Jika berhasil, akan muncul notifikasi "Berhasil terhubung ke Accurate Online
(<nama Data Usaha>)" dan badge **Terhubung: <nama Data Usaha>** akan tampil.
Backend otomatis menyimpan host API dinamis (mis. `https://zeus.accurate.id`)
hasil respons `/api/api-token.do` — Anda tidak perlu mengisi host secara manual.

### Test Koneksi

Setelah tersambung, tombol **Test Koneksi** di sebelah tombol simpan dapat
dipakai kapan saja untuk memverifikasi ulang kredensial yang sudah tersimpan
(tanpa perlu mengisi ulang form) — berguna untuk memastikan token masih
berlaku sebelum menjalankan sync data.

---

## 🔍 TROUBLESHOOTING SINGKAT

Lihat **ACCURATE_TROUBLESHOOTING.md** untuk daftar error lengkap. Ringkasan:

| Gejala | Penyebab paling umum |
|---|---|
| "Sesi Accurate telah berakhir" / HTTP 401 | API Token sudah dihapus/direvoke di Accurate Store, atau Signature Secret salah |
| "Header X-Api-Signature invalid" | Signature Secret salah, atau timestamp tidak di-hash dengan benar |
| "X-Api Timestamp difference more than 600 seconds" | Jam server backend tidak sinkron (drift > 10 menit) dengan waktu Accurate |
| "API Token belum dikonfigurasi" | Field App Key/Signature Secret/API Token masih kosong di Pengaturan |

---

## 🎯 QUICK REFERENCE

**Area Developer Accurate:** https://developer.accurate.id/
**Install Aplikasi & Buat API Token:** Pengaturan → Accurate Store (di accurate.id)
**Dokumentasi resmi:** `accurate/accurate-online-api-token-1.0.3_page-*.jpg` (folder `accurate/` di repo ini)
**Endpoint verifikasi token:** `POST https://account.accurate.id/api/api-token.do`

---

**Last Updated:** 06 Juli 2026
**Status:** Sesuai implementasi kode saat ini (skema API Token, bukan OAuth)
