# DataAnalis - Deployment Guide

## 📋 Persyaratan Sistem

- Docker Engine 20.x atau lebih baru
- Docker Compose v2.x atau lebih baru
- Minimal 2GB RAM tersedia
- Minimal 5GB disk space

## 🚀 Deployment ke VPS

### 1. Persiapan

Clone atau upload project ke VPS Anda:

```bash
# Upload project ke VPS
scp -r dataanalis/ user@your-vps-ip:/opt/
```

### 2. Konfigurasi Environment

```bash
cd /opt/dataanalis

# Copy file environment production
cp .env.production .env.production.local

# Edit konfigurasi sesuai kebutuhan
nano .env.production
```

**Penting:** Ubah nilai berikut di `.env.production`:

- `DB_PASSWORD` - Password database MySQL
- `DB_ROOT_PASSWORD` - Root password MySQL
- `JWT_ACCESS_SECRET` - Secret key untuk JWT access token
- `JWT_REFRESH_SECRET` - Secret key untuk JWT refresh token
- `ENCRYPTION_KEY` - Key untuk enkripsi OAuth tokens
- `ACCURATE_CLIENT_ID` - Client ID dari Accurate Online
- `ACCURATE_CLIENT_SECRET` - Client Secret dari Accurate Online
- `ACCURATE_REDIRECT_URI` - Redirect URI (ganti dengan domain Anda)
- `NEXT_PUBLIC_API_URL` - URL API backend (ganti dengan domain Anda)

### 3. Deploy Aplikasi

```bash
# Berikan permission pada script deployment
chmod +x deploy.sh

# Jalankan deployment
./deploy.sh
```

Script ini akan:
- Memuat environment variables
- Memeriksa Docker
- Menghentikan container lama (jika ada)
- Build dan start container baru
- Menampilkan status deployment

### 4. Verifikasi Deployment

```bash
# Cek status container
docker ps | grep dataanalis

# Cek logs
docker logs dataanalis-web
docker logs dataanalis-api
docker logs dataanalis-mysql
```

## 🔌 Port yang Digunakan

| Service | Internal Port | External Port | Container Name |
|---------|---------------|---------------|----------------|
| Frontend (Next.js) | 3000 | 3010 | dataanalis-web |
| Backend (Express) | 5000 | 5010 | dataanalis-api |
| Database (MySQL) | 3306 | 3309 | dataanalis-mysql |

**Catatan:** Port eksternal dipilih agar tidak bentrok dengan aplikasi lain di VPS:
- Port 3010 untuk frontend (bukan 3000, 3308, 3360)
- Port 5010 untuk backend (bukan 5000, 5001, 5002, 5006, 5066)
- Port 3309 untuk MySQL (bukan 3306, 3308, 3360)

## 🌐 Akses Aplikasi

Setelah deployment berhasil:

- **Frontend**: `http://your-vps-ip:3010`
- **Backend API**: `http://your-vps-ip:5010/api`
- **MySQL**: `your-vps-ip:3309`

## 🔧 Management Commands

### Melihat Logs

```bash
# Semua services
docker-compose --env-file .env.production logs -f

# Service tertentu
docker logs -f dataanalis-web
docker logs -f dataanalis-api
docker logs -f dataanalis-mysql
```

### Restart Services

```bash
# Restart semua
docker-compose --env-file .env.production restart

# Restart service tertentu
docker restart dataanalis-web
docker restart dataanalis-api
docker restart dataanalis-mysql
```

### Stop Services

```bash
docker-compose --env-file .env.production down
```

### Update Aplikasi

```bash
# Pull kode terbaru
git pull origin main

# Rebuild dan restart
./deploy.sh
```

### Database Backup

```bash
# Backup database
docker exec dataanalis-mysql mysqldump -u root -p${DB_ROOT_PASSWORD} dataanalis > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker exec -i dataanalis-mysql mysql -u root -p${DB_ROOT_PASSWORD} dataanalis < backup_file.sql
```

## 🔒 Setup HTTPS dengan Nginx Reverse Proxy

Untuk production, disarankan menggunakan Nginx sebagai reverse proxy dengan SSL:

```nginx
# /etc/nginx/sites-available/dataanalis

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5010;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

Aktifkan konfigurasi:

```bash
sudo ln -s /etc/nginx/sites-available/dataanalis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔍 Troubleshooting

### Container tidak start

```bash
# Cek logs untuk error
docker logs dataanalis-api
docker logs dataanalis-web
docker logs dataanalis-mysql

# Cek resource usage
docker stats
```

### Database connection error

```bash
# Cek apakah MySQL sudah ready
docker exec dataanalis-mysql mysqladmin ping -h localhost -u root -p

# Restart database
docker restart dataanalis-mysql
```

### Port sudah digunakan

Jika port bentrok, edit `docker-compose.yml`:

```yaml
ports:
  - "PORT_BARU:3000"  # Ubah PORT_BARU
```

### Reset semua data

```bash
# HATI-HATI: Ini akan menghapus semua data!
docker-compose --env-file .env.production down -v
./deploy.sh
```

## 📊 Monitoring

### Setup PM2 untuk monitoring (Opsional)

Jika ingin monitoring dengan PM2:

```bash
npm install -g pm2

# Buat ecosystem file
pm2 ecosystem
```

Edit `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'dataanalis-monitor',
    script: 'docker',
    args: 'compose --env-file .env.production up',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

// Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🛡️ Security Checklist

- [ ] Ubah semua default passwords
- [ ] Generate JWT secrets yang kuat
- [ ] Setup firewall (UFW/iptables)
- [ ] Enable HTTPS dengan SSL certificate
- [ ] Batasi akses database hanya dari container
- [ ] Regular backup database
- [ ] Update Docker images secara berkala
- [ ] Monitor logs untuk aktivitas mencurigakan

## 📞 Support

Jika mengalami masalah, cek:
1. Docker logs: `docker logs [container-name]`
2. Environment variables: `docker exec [container] env`
3. Network connectivity: `docker network inspect dataanalis-network`
