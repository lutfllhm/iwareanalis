# 🌐 Nginx & SSL Setup untuk Domain iwanalys.iwareid.com

Panduan lengkap untuk setup Nginx reverse proxy dan SSL certificate menggunakan Let's Encrypt.

---

## 📋 Prerequisites

- Domain sudah pointing ke IP VPS Anda (`iwanalys.iwareid.com`)
- Docker & Docker Compose sudah terinstall
- Port 80 dan 443 terbuka di firewall VPS

---

## 🚀 Setup Nginx dengan Let's Encrypt SSL

### 1️⃣ Persiapkan Folder Struktur

```bash
cd ~/projects/iwareanalis

# Create folders untuk certbot dan nginx logs
mkdir -p certbot/conf certbot/www logs/nginx

# Verify structure
ls -la certbot/
ls -la logs/
```

---

### 2️⃣ Konfigurasi DNS (Penting!)

Pastikan DNS record sudah benar di domain registrar:

```
A Record: iwanalys.iwareid.com → your_vps_ip
```

Verifikasi:
```bash
nslookup iwanalys.iwareid.com
# atau
dig iwanalys.iwareid.com
```

---

### 3️⃣ Generate SSL Certificate dengan Certbot

#### Menggunakan Certbot (Recommended)

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Jalankan certbot untuk generate certificate
sudo certbot certonly --standalone \
  -d iwanalys.iwareid.com \
  -d www.iwanalys.iwareid.com \
  --email your_email@example.com \
  --agree-tos \
  --no-eff-email

# Lihat hasil certificate
ls -la /etc/letsencrypt/live/iwanalys.iwareid.com/
```

**Output yang diharapkan:**
```
/etc/letsencrypt/live/iwanalys.iwareid.com/
├── cert.pem        → certificate
├── chain.pem       → chain
├── fullchain.pem   → full certificate chain
└── privkey.pem     → private key
```

#### Copy Certificate ke Project Folder

```bash
sudo cp -r /etc/letsencrypt/live/iwanalys.iwareid.com/ \
  ~/projects/iwareanalis/certbot/conf/live/

sudo chown -R $USER:$USER ~/projects/iwareanalis/certbot/
```

---

### 4️⃣ Verify docker-compose.yml

Pastikan file sudah ter-update dengan Nginx service:

```bash
cat docker-compose.yml | grep -A 15 "nginx:"
```

Expected output:
```yaml
  nginx:
    image: nginx:latest
    container_name: dataanalis_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - dataanalis_net
```

---

### 5️⃣ Setup Frontend Environment Variables

```bash
# Create .env.local untuk Next.js
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://iwanalys.iwareid.com/api
EOF

# Verify
cat frontend/.env.local
```

---

### 6️⃣ Start Docker Containers dengan Nginx

```bash
cd ~/projects/iwareanalis

# Build images
docker-compose build

# Start services
docker-compose up -d

# Verify all containers running
docker-compose ps

# Check nginx logs
docker-compose logs nginx
```

**Expected output:**
```
NAME                   IMAGE              COMMAND
dataanalis_nginx       nginx:latest       nginx -g daemon off;
dataanalis_frontend    <custom>           docker-entrypoint.sh
dataanalis_backend     <custom>           docker-entrypoint.sh
dataanalis_mysql       mysql:8.0          docker-entrypoint.sh mysqld
dataanalis_phpmyadmin  phpmyadmin:latest  docker-php-entrypoint apache2-foreground
```

---

### 7️⃣ Test Nginx Configuration

```bash
# Test nginx config syntax
docker exec dataanalis_nginx nginx -t

# Output yang diharapkan:
# nginx: the configuration file /etc/nginx/conf.d/default.conf syntax is ok
# nginx: configuration file /etc/nginx/conf.d/default.conf test is successful
```

---

## ✅ Verifikasi Setup

### 1. Test Frontend

Buka browser dan akses:
```
https://iwanalys.iwareid.com
```

Harus bisa akses frontend tanpa SSL warning ✅

### 2. Test Backend API

```bash
# Via browser atau curl
curl -k https://iwanalys.iwareid.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","environment":"production",...}
```

### 3. Check SSL Certificate

```bash
# Via browser: klik lock icon di address bar
# Atau via command:
openssl s_client -connect iwanalys.iwareid.com:443 -servername iwanalys.iwareid.com

# Cek validity
openssl x509 -in /etc/letsencrypt/live/iwanalys.iwareid.com/cert.pem -noout -dates
```

### 4. SSL Test Score

Cek di: https://www.ssllabs.com/ssltest/analyze.html?d=iwanalys.iwareid.com

---

## 🔄 Auto-Renewal SSL Certificate

Let's Encrypt certificate valid 90 hari. Setup auto-renewal:

```bash
# Edit crontab
sudo crontab -e

# Add this line to renew certificate setiap hari pada jam 2 pagi:
0 2 * * * certbot renew --quiet && systemctl reload nginx
```

Atau jika menggunakan Certbot dengan Docker:

```bash
# Buat script renewal
sudo tee /usr/local/bin/renew-cert.sh > /dev/null << 'EOF'
#!/bin/bash
certbot renew --quiet
docker-compose -f /root/projects/iwareanalis/docker-compose.yml restart nginx
EOF

sudo chmod +x /usr/local/bin/renew-cert.sh

# Add ke crontab
0 2 * * * /usr/local/bin/renew-cert.sh
```

---

## 🐛 Troubleshooting

### SSL Certificate Error

```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/iwanalys.iwareid.com/cert.pem -noout -text

# Renew certificate manually
sudo certbot renew --force-renewal

# Restart nginx setelah renew
docker-compose restart nginx
```

### Nginx Not Starting

```bash
# Check logs
docker-compose logs nginx

# Test config
docker exec dataanalis_nginx nginx -t

# Restart
docker-compose restart nginx
```

### Cannot Access via Domain

```bash
# Check DNS resolution
nslookup iwanalys.iwareid.com

# Test connection
curl -v https://iwanalys.iwareid.com

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### CORS Error

Edit `docker-compose.yml` - verifikasi environment variables sudah benar:

```yaml
environment:
  - ACCURATE_REDIRECT_URI=https://iwanalys.iwareid.com/settings
```

Juga check `backend/src/app.ts` - origin harus include domain Anda.

---

## 📊 Monitoring

### View Nginx Logs Real-time

```bash
# Access logs
docker-compose exec nginx tail -f /var/log/nginx/iwanalys_access.log

# Error logs
docker-compose exec nginx tail -f /var/log/nginx/iwanalys_error.log
```

### Check Certificate Expiry

```bash
# Dengan command
echo | openssl s_client -servername iwanalys.iwareid.com -connect iwanalys.iwareid.com:443 2>/dev/null | openssl x509 -noout -dates

# Atau check local file
openssl x509 -in /etc/letsencrypt/live/iwanalys.iwareid.com/cert.pem -noout -dates
```

---

## 🔐 Security Tips

1. **Update nginx.conf regularly** - check nginx security best practices
2. **Restrict PhpMyAdmin access** - edit location /phpmyadmin di nginx.conf
3. **Add Rate Limiting** - untuk prevent DDoS
4. **Enable ModSecurity** - untuk WAF protection
5. **Monitor SSL scores** - regular check di SSL Labs

---

## 📝 File Locations

```
~/projects/iwareanalis/
├── docker-compose.yml           ← Include Nginx service
├── nginx.conf                   ← Nginx configuration
├── certbot/
│   ├── conf/                    ← SSL certificates
│   └── www/                     ← Certbot validation
├── logs/
│   └── nginx/                   ← Nginx logs
├── backend/
│   ├── .env                     ← Backend config (ACCURATE_REDIRECT_URI)
│   └── src/app.ts               ← CORS configuration
└── frontend/
    ├── .env.local               ← Frontend config (NEXT_PUBLIC_API_URL)
    └── src/lib/api.ts           ← API base URL
```

---

## 📞 Next Steps

1. ✅ Generate SSL certificate dengan certbot
2. ✅ Copy certificate ke certbot/conf folder
3. ✅ Update docker-compose.yml dengan Nginx service
4. ✅ Configure frontend .env.local
5. ✅ Start docker-compose with `docker-compose up -d`
6. ✅ Verify akses via https://iwanalys.iwareid.com
7. ✅ Setup auto-renewal untuk SSL certificate
8. ✅ Monitor logs dan performance

---

**Created**: 2026-06-15
**Domain**: iwanalys.iwareid.com
**Version**: 1.0
