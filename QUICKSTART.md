# 🚀 DataAnalis - Quick Start Guide

## Deployment Cepat ke VPS

### Langkah 1: Upload Project ke VPS

```bash
# Upload ke VPS
scp -r dataanalis/ user@your-vps-ip:/opt/

# Atau clone dari git
ssh user@your-vps-ip
cd /opt
git clone your-repo-url dataanalis
cd dataanalis
```

### Langkah 2: Konfigurasi Environment

```bash
# Edit file .env.production
nano .env.production
```

**Wajib diubah:**
```env
# Ganti dengan domain/IP VPS Anda
ACCURATE_REDIRECT_URI=http://103.XXX.XXX.XXX:3010/settings
NEXT_PUBLIC_API_URL=http://103.XXX.XXX.XXX:5010/api

# Ganti dengan password yang kuat
DB_PASSWORD=password_yang_kuat_123
DB_ROOT_PASSWORD=root_password_kuat_456

# Generate JWT secrets baru (gunakan random string)
JWT_ACCESS_SECRET=your_random_secret_here_32_chars
JWT_REFRESH_SECRET=your_another_random_secret_32chars

# Jika sudah punya Accurate Online credentials
ACCURATE_MOCK=false
ACCURATE_CLIENT_ID=your_client_id
ACCURATE_CLIENT_SECRET=your_client_secret
```

### Langkah 3: Deploy!

```bash
# Berikan permission
chmod +x deploy.sh healthcheck.sh

# Jalankan deployment
./deploy.sh
```

### Langkah 4: Verifikasi

```bash
# Cek health
./healthcheck.sh

# Atau manual check
curl http://localhost:3010  # Frontend
curl http://localhost:5010/api/health  # Backend
```

## 🎯 Akses Aplikasi

- **Frontend**: `http://your-vps-ip:3010`
- **Backend API**: `http://your-vps-ip:5010/api`

## 📊 Port yang Digunakan

| Service | Port | Tidak Bentrok Dengan |
|---------|------|---------------------|
| Frontend | 3010 | 3000, 3308, 3360, 8090 |
| Backend | 5010 | 5000-5006, 5066, 8092 |
| MySQL | 3309 | 3306, 3308, 3360 |

## ⚡ Quick Commands

```bash
# Lihat logs
docker logs -f dataanalis-web     # Frontend logs
docker logs -f dataanalis-api     # Backend logs
docker logs -f dataanalis-mysql   # Database logs

# Restart services
docker restart dataanalis-web
docker restart dataanalis-api

# Stop semua
docker-compose --env-file .env.production down

# Start lagi
docker-compose --env-file .env.production up -d

# Health check
./healthcheck.sh
```

## 🔧 Jika Menggunakan Makefile

```bash
# Development
make dev          # Start development
make dev-logs     # Lihat logs
make dev-stop     # Stop

# Production
make prod         # Deploy production
make prod-logs    # Lihat logs
make prod-stop    # Stop

# Database
make backup       # Backup database

# Info
make help         # Lihat semua commands
```

## 🛡️ Setup Firewall (Recommended)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (jika pakai Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow aplikasi ports
sudo ufw allow 3010/tcp
sudo ufw allow 5010/tcp

# Enable firewall
sudo ufw enable
```

## 🌐 Setup Domain (Optional)

Jika punya domain, setup DNS A record:

```
Type: A
Name: dataanalis (atau @)
Value: YOUR_VPS_IP
TTL: 3600
```

Kemudian update `.env.production`:

```env
ACCURATE_REDIRECT_URI=http://dataanalis.yourdomain.com:3010/settings
NEXT_PUBLIC_API_URL=http://dataanalis.yourdomain.com:5010/api
```

## 🔒 Setup HTTPS dengan Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

Copy `nginx.conf` ke Nginx:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/dataanalis
sudo ln -s /etc/nginx/sites-available/dataanalis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ❌ Troubleshooting

### Container tidak start

```bash
# Cek logs
docker logs dataanalis-api

# Cek resource
docker stats

# Cek network
docker network inspect dataanalis-network
```

### Port sudah digunakan

Cek port yang dipakai:
```bash
sudo netstat -tulpn | grep :3010
sudo netstat -tulpn | grep :5010
```

Jika bentrok, edit `docker-compose.yml` bagian ports.

### Database connection error

```bash
# Cek database
docker exec dataanalis-mysql mysql -u root -p -e "SHOW DATABASES;"

# Restart database
docker restart dataanalis-mysql
```

### Reset semua (HATI-HATI!)

```bash
# Stop dan hapus semua
docker-compose --env-file .env.production down -v

# Deploy ulang
./deploy.sh
```

## 📞 Need Help?

1. Cek logs: `docker logs [container-name]`
2. Health check: `./healthcheck.sh`
3. Lihat status: `docker ps | grep dataanalis`
4. Restart: `docker restart [container-name]`

## ✅ Checklist Deployment

- [ ] Upload project ke VPS
- [ ] Edit `.env.production` dengan nilai yang benar
- [ ] Jalankan `./deploy.sh`
- [ ] Verifikasi dengan `./healthcheck.sh`
- [ ] Akses frontend di browser
- [ ] Setup firewall
- [ ] (Optional) Setup domain
- [ ] (Optional) Setup HTTPS
- [ ] Backup database secara berkala

---

**Selamat! Aplikasi DataAnalis sudah siap digunakan!** 🎉
