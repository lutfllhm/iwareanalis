# 🚀 PANDUAN DEPLOYMENT DATAANALIS

Dokumen ini berisi panduan lengkap satu halaman untuk men-deploy aplikasi **DataAnalis** (Next.js frontend, Express backend, dan MySQL database) di VPS Ubuntu/Debian menggunakan Docker Compose dan Nginx Reverse Proxy dengan SSL HTTPS.

---

## 📋 Prasyarat Server (Prerequisites)

Sebelum mulai, pastikan spesifikasi minimal VPS Anda terpenuhi:
*   **OS:** Ubuntu 20.04 LTS / Ubuntu 22.04 LTS atau Debian 11/12
*   **RAM:** Minimal 2 GB (Rekomendasi 4 GB)
*   **Disk Space:** Minimal 10 GB
*   **Domain:** Domain yang sudah diarahkan ke IP VPS Anda (Contoh: `analys.iwareid.com`)

---

## 🛠️ Langkah-Langkah Deployment

### Langkah 1: Persiapan Server & Install Dependency

Jalankan perintah berikut di terminal VPS untuk memperbarui sistem dan menginstal Docker, Docker Compose, Nginx, dan Certbot:

```bash
# Update repository & upgrade package
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y

# Install Docker Compose (v2)
sudo apt install docker-compose-plugin -y

# Install Nginx & Certbot untuk SSL
sudo apt install nginx certbot python3-certbot-nginx -y
```

Pastikan Docker berjalan:
```bash
sudo systemctl enable --now docker
sudo systemctl status docker
```

---

### Langkah 2: Setup Repository & Environment (.env)

1. Clone repository project Anda di VPS:
   ```bash
   git clone https://github.com/lutfllhm/iwareanalis.git /var/www/dataanalis
   cd /var/www/dataanalis
   ```

2. Buat file konfigurasi `.env` untuk production dengan menyalin file template:
   ```bash
   cp .env.production .env
   ```

3. Edit file `.env` menggunakan nano atau editor teks lainnya:
   ```bash
   nano .env
   ```

   **Sesuaikan variabel-variabel berikut dengan benar:**
   ```env
   # Database Configuration (Ganti dengan password yang kuat)
   DB_NAME=dataanalis
   DB_USER=dataanalis_user
   DB_PASSWORD=GANTI_DENGAN_PASSWORD_DATABASE_KUAT
   DB_ROOT_PASSWORD=GANTI_DENGAN_PASSWORD_ROOT_DATABASE_KUAT

   # Backend Configuration
   PORT=5010
   NODE_ENV=production

   # JWT Security Secrets (Ganti dengan string acak panjang minimal 32 karakter)
   JWT_ACCESS_SECRET=ganti_dengan_jwt_access_secret_acak_dan_panjang
   JWT_REFRESH_SECRET=ganti_dengan_jwt_refresh_secret_acak_dan_panjang

   # Encryption Key untuk token Accurate (Harus 64 karakter Hex/32 bytes)
   # Anda bisa membuatnya dengan perintah: openssl rand -hex 32
   ENCRYPTION_KEY=e9ca72b146473e659357a7dbd8bc4b6845cb067756f7efb0f443b71c4c16a8b1

   # Accurate Online API Configuration (Ganti sesuai aplikasi Accurate Developer Anda)
   ACCURATE_MOCK=false
   ACCURATE_CLIENT_ID=ganti_dengan_client_id_dari_accurate
   ACCURATE_CLIENT_SECRET=ganti_dengan_client_secret_dari_accurate
   ACCURATE_REDIRECT_URI=https://analys.iwareid.com/settings

   # Frontend API URL (Ganti dengan domain Anda)
   NEXT_PUBLIC_API_URL=https://analys.iwareid.com/api
   ```
   *Tekan `Ctrl+O` lalu `Enter` untuk menyimpan, dan `Ctrl+X` untuk keluar dari Nano.*

---

### Langkah 3: Konfigurasi Nginx & SSL HTTPS

1. Salin konfigurasi `nginx.conf` ke folder Nginx:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/dataanalis
   ```

2. Buat tautan simbolis (symlink) untuk mengaktifkan konfigurasi:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dataanalis /etc/nginx/sites-enabled/
   ```

3. Hapus konfigurasi default Nginx (opsional, jika konflik):
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

4. Buat SSL Certificate dengan Certbot untuk domain Anda (`analys.iwareid.com`):
   ```bash
   sudo certbot --nginx -d analys.iwareid.com
   ```
   *Ikuti instruksi di layar (masukkan email, setujui terms, dll). Certbot akan secara otomatis memperbarui file konfigurasi Nginx dengan jalur sertifikat SSL Let's Encrypt yang baru.*

5. Uji konfigurasi Nginx untuk memastikan tidak ada kesalahan sintaks:
   ```bash
   sudo nginx -t
   ```

6. Restart Nginx untuk menerapkan perubahan:
   ```bash
   sudo systemctl restart nginx
   ```

---

### Langkah 4: Build & Jalankan Docker Container

Jalankan perintah berikut untuk mengunduh image, melakukan build container, dan menjalankannya di background:

```bash
# Menggunakan docker compose v2
docker compose --env-file .env up -d --build
```
*Catatan: Proses build frontend Next.js mungkin memakan waktu beberapa menit tergantung pada CPU VPS.*

Periksa apakah semua container berhasil berjalan:
```bash
docker compose ps
```
Hasil yang diharapkan:
*   `dataanalis-mysql` - Running (Ports: 3309->3306)
*   `dataanalis-api` - Running (Ports: 5010->5000)
*   `dataanalis-web` - Running (Ports: 3010->3000)

---

### Langkah 5: Pengujian & Verifikasi

Buka browser Anda dan akses:
*   **Frontend Web:** `https://analys.iwareid.com` (Harus menampilkan dashboard login)
*   **Backend API Health:** `https://analys.iwareid.com/api/health` atau `https://analys.iwareid.com/health` (Harus merespons dengan JSON `{"status": "OK"}` atau serupa)

---

## 🛠️ Perintah Pengelolaan (Maintenance Commands)

Jalankan perintah ini di dalam direktori `/var/www/dataanalis`:

### Melihat Log Aplikasi
Untuk memantau log semua container secara real-time:
```bash
docker compose logs -f
```
Atau memantau log backend saja:
```bash
docker compose logs -f dataanalis-backend
```

### Menghentikan dan Menghidupkan Ulang Aplikasi
*   **Menghentikan aplikasi:**
    ```bash
    docker compose down
    ```
*   **Menghentikan & menghapus volume (Hapus Database - PERINGATAN: DATA AKAN HILANG!):**
    ```bash
    docker compose down -v
    ```
*   **Restart aplikasi:**
    ```bash
    docker compose restart
    ```

### Backup & Restore Database MySQL

*   **Backup Database:**
    ```bash
    docker exec dataanalis-mysql mysqldump -u root -p dataanalis > backup.sql
    ```
*   **Restore Database:**
    ```bash
    docker exec -i dataanalis-mysql mysql -u root -p dataanalis < backup.sql
    ```

---

## 🔒 Security Checklist setelah Deploy

1. [ ] Pastikan UFW (Firewall) aktif dan hanya port `80`, `443`, dan `22` (SSH) yang dibuka ke publik.
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
2. [ ] Ubah semua password default di `.env` (`DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
3. [ ] Simpan salinan cadangan dari `ENCRYPTION_KEY` di tempat yang aman.
