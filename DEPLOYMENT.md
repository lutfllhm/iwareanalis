# 📋 Panduan Deployment DataAnalis ke VPS

Dokumen ini berisi langkah-langkah lengkap untuk men-deploy aplikasi DataAnalis ke VPS Anda.

---

## 📋 Prasyarat

Pastikan VPS Anda sudah memiliki:
- **Docker** (versi 20.10+)
- **Docker Compose** (versi 1.29+)
- **Git** (untuk clone repository)
- **Port yang tersedia**: 3010, 5010, 3320, 8094

> ℹ️ **Info Port:**
> - Frontend: `3010`
> - Backend: `5010`
> - MySQL: `3320`
> - PhpMyAdmin: `8094`

---

## 🚀 Langkah-Langkah Deployment

### 1️⃣ Connect ke VPS via SSH

```bash
ssh your_username@your_vps_ip
# atau
ssh -i /path/to/private_key your_username@your_vps_ip
```

---

### 2️⃣ Instalasi Docker & Docker Compose (jika belum ada)

#### Untuk Ubuntu/Debian:

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verifikasi instalasi
docker --version
docker-compose --version

# Add current user ke docker group (opsional, agar tidak perlu sudo)
sudo usermod -aG docker $USER
```

#### Untuk CentOS/RHEL:

```bash
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

### 3️⃣ Clone Repository dari GitHub

```bash
# Pilih folder untuk project
mkdir -p ~/projects
cd ~/projects

# Clone repository
git clone https://github.com/lutfllhm/iwareanalis.git
cd iwareanalis

# Verifikasi branch
git branch -v
```

---

### 4️⃣ Konfigurasi Environment Variables

#### Backend (.env)

```bash
# Edit atau buat file backend/.env
nano backend/.env
```

Isi dengan:

```env
PORT=5010
NODE_ENV=production
DATABASE_URL=mysql://dataanalis_user:dataanalis_password@db:3306/dataanalis
JWT_ACCESS_SECRET=dataanalis_access_secret_key_change_me_in_production_9988
JWT_REFRESH_SECRET=dataanalis_refresh_secret_key_change_me_in_production_7766
ENCRYPTION_KEY=e9ca72b146473e659357a7dbd8bc4b6845cb067756f7efb0f443b71c4c16a8b1
ACCURATE_MOCK=true
ACCURATE_CLIENT_ID=your_client_id_here
ACCURATE_CLIENT_SECRET=your_client_secret_here
ACCURATE_REDIRECT_URI=http://your_vps_ip:3010/settings
```

> ⚠️ **PENTING**: Ganti `ACCURATE_CLIENT_ID`, `ACCURATE_CLIENT_SECRET`, dan `your_vps_ip` dengan nilai yang sesuai!

#### Frontend (.env.local)

```bash
# Edit atau buat file frontend/.env.local
nano frontend/.env.local
```

Isi dengan:

```env
NEXT_PUBLIC_API_URL=http://your_vps_ip:5010/api
```

> ⚠️ Ganti `your_vps_ip` dengan IP VPS Anda!

---

### 5️⃣ Verifikasi docker-compose.yml

```bash
# Lihat konfigurasi docker-compose
cat docker-compose.yml
```

Pastikan port configuration:
- MySQL: `3320:3306` ✅
- PhpMyAdmin: `8094:80` ✅
- Backend: `5010:5010` ✅
- Frontend: `3010:3000` ✅

---

### 6️⃣ Build dan Deploy dengan Docker Compose

```bash
# Navigate ke project directory
cd ~/projects/iwareanalis

# Build images (opsional, akan auto-build saat up)
docker-compose build

# Start all services
docker-compose up -d

# Verifikasi containers running
docker-compose ps
```

**Output yang diharapkan:**
```
NAME                 COMMAND                  SERVICE      STATUS
dataanalis_mysql     "docker-entrypoint.s…"   db           Up (healthy)
dataanalis_phpmyadmin "docker-php-entrypoint…" phpmyadmin   Up
dataanalis_backend   "docker-entrypoint.sh…"  backend      Up
dataanalis_frontend  "docker-entrypoint.sh…"  frontend     Up
```

---

### 7️⃣ Verifikasi Aplikasi Berjalan

```bash
# Check logs backend
docker-compose logs backend

# Check logs frontend
docker-compose logs frontend

# Check logs database
docker-compose logs db
```

**Output backend yang seharapkan:**
```
backend         | Server started successfully on port 5010 in production mode
```

---

### 8️⃣ Akses Aplikasi

Buka browser Anda dan akses:

| Service | URL |
|---------|-----|
| **Frontend** | `http://your_vps_ip:3010` |
| **Backend API** | `http://your_vps_ip:5010/api/health` |
| **PhpMyAdmin** | `http://your_vps_ip:8094` |

---

## 🔧 Troubleshooting

### Containers tidak running

```bash
# Check logs
docker-compose logs

# Restart all services
docker-compose restart

# Stop semua services
docker-compose down

# Start ulang
docker-compose up -d
```

### Port sudah terpakai

```bash
# Cek port yang terpakai
sudo netstat -tulpn | grep :3010
sudo netstat -tulpn | grep :5010
sudo netstat -tulpn | grep :3320
sudo netstat -tulpn | grep :8094

# Kill process yang menggunakan port (gunakan dengan hati-hati)
sudo fuser -k 3010/tcp
```

### Database connection error

```bash
# Verifikasi database container running
docker-compose ps db

# Check database logs
docker-compose logs db

# Cek credentials di docker-compose.yml
cat docker-compose.yml | grep MYSQL
```

### Frontend cannot connect to backend

```bash
# Verifikasi backend URL di frontend
docker-compose logs frontend

# Test backend connectivity dari dalam container
docker exec dataanalis_frontend curl http://dataanalis_backend:5010/api/health
```

---

## 📊 Monitoring & Management

### Lihat status semua containers

```bash
docker-compose ps
```

### View real-time logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Restart service tertentu

```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart db
```

### Stop semua services (tanpa delete data)

```bash
docker-compose stop
```

### Start kembali setelah di-stop

```bash
docker-compose start
```

### Rebuild images

```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## 🗑️ Cleanup (Jika ingin remove)

### Stop dan remove containers

```bash
docker-compose down
```

### Remove volume data (⚠️ Data akan hilang!)

```bash
docker-compose down -v
```

### Remove semua (containers, images, volumes)

```bash
docker-compose down -v --rmi all
```

---

## 🔐 Production Best Practices

### 1. Update environment secrets

```bash
# Edit sensitive data
nano backend/.env

# Update JWT secrets
JWT_ACCESS_SECRET=your_strong_random_secret_here
JWT_REFRESH_SECRET=your_strong_random_secret_here
ENCRYPTION_KEY=your_64_char_hex_string_here
```

### 2. Setup firewall rules

```bash
# Allow ports yang diperlukan
sudo ufw allow 3010/tcp
sudo ufw allow 5010/tcp
sudo ufw allow 3320/tcp
sudo ufw allow 8094/tcp
sudo ufw enable
```

### 3. Enable auto-restart

Container sudah dikonfigurasi dengan `restart: always`, jadi akan auto-restart jika VPS reboot.

### 4. Backup database

```bash
# Backup MySQL database
docker-compose exec db mysqldump -u dataanalis_user -pdataanalis_password dataanalis > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore dari backup
docker-compose exec -T db mysql -u dataanalis_user -pdataanalis_password dataanalis < backup_20260615_120000.sql
```

### 5. Monitor disk space

```bash
# Check disk usage
du -sh ~/projects/iwareanalis

# Check docker volumes
docker volume ls
docker volume inspect iwareanalis_mysql_data
```

---

## 📞 Support & Issues

Jika ada masalah selama deployment:

1. Check logs menggunakan `docker-compose logs`
2. Verifikasi konfigurasi di `docker-compose.yml` dan file `.env`
3. Pastikan port tidak berbenturan dengan aplikasi lain
4. Cek resource VPS (CPU, RAM, disk space)

---

**Created**: 2026-06-15
**Version**: 1.0
**Repository**: https://github.com/lutfllhm/iwareanalis.git
