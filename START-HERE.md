# 🚀 START HERE - DataAnalis Deployment Guide

## 📌 Mulai dari Sini!

Selamat datang! File ini adalah panduan lengkap untuk deploy aplikasi DataAnalis ke VPS Anda.

## 🎯 Tujuan

Deploy aplikasi DataAnalis (Dashboard Accurate Online) ke VPS dengan:
- ✅ **Port yang tidak bentrok** dengan aplikasi existing
- ✅ **Container names yang unik**
- ✅ **Production-ready configuration**
- ✅ **No crashes, no conflicts**

## 📊 Konfigurasi yang Sudah Disiapkan

### Port Mapping (DIJAMIN TIDAK BENTROK!)

| Service | External Port | Status |
|---------|---------------|--------|
| Frontend Web | **3010** | ✅ Aman |
| Backend API | **5010** | ✅ Aman |
| MySQL Database | **3309** | ✅ Aman |

**Port yang dihindari:** 3000, 3308, 3360, 5000-5006, 5066, 8090, 8092

### Container Names (Unique)

- `dataanalis-mysql` - Database
- `dataanalis-api` - Backend
- `dataanalis-web` - Frontend

## 📚 Dokumentasi yang Tersedia

### 🚀 Quick Start
1. **[QUICKSTART.md](QUICKSTART.md)** - Panduan cepat 5 menit
   - Step-by-step deployment
   - Quick commands
   - Basic troubleshooting

### 📖 Comprehensive Guides
2. **[README.md](README.md)** - Dokumentasi utama
   - Feature list
   - Tech stack
   - API documentation
   
3. **[README.DEPLOYMENT.md](README.DEPLOYMENT.md)** - Deployment lengkap
   - Detailed configuration
   - Security best practices
   - Monitoring & maintenance

### 📦 Deployment Resources
4. **[DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md)** - Summary & checklist
   - File inventory
   - Configuration checklist
   - Management commands

5. **[FILES-CREATED.md](FILES-CREATED.md)** - Daftar file deployment
   - 20+ deployment files
   - Purpose setiap file
   - Usage guide

6. **[DEPLOYMENT-DIAGRAM.md](DEPLOYMENT-DIAGRAM.md)** - Visual architecture
   - System diagram
   - Network flow
   - Security layers

### 📤 Upload Guide
7. **[UPLOAD-TO-VPS.md](UPLOAD-TO-VPS.md)** - Cara upload ke VPS
   - SCP, Git, FTP methods
   - Security best practices
   - Troubleshooting upload

## ⚡ Quick Start (3 Steps)

### Step 1: Edit Environment (5 menit)

```bash
# Buka file ini
notepad .env.production

# Ubah nilai berikut:
DB_PASSWORD=password_kuat_anda
DB_ROOT_PASSWORD=root_password_kuat
JWT_ACCESS_SECRET=random_string_32_karakter_atau_lebih
JWT_REFRESH_SECRET=random_string_lain_32_karakter
ACCURATE_REDIRECT_URI=http://IP_VPS_ANDA:3010/settings
NEXT_PUBLIC_API_URL=http://IP_VPS_ANDA:5010/api
```

### Step 2: Upload ke VPS (10 menit)

**Pilih salah satu metode:**

#### A. Via WinSCP (Termudah)
1. Download [WinSCP](https://winscp.net/)
2. Connect ke VPS (IP, username, password)
3. Drag & drop folder `dataanalis` ke `/opt/`

#### B. Via Command Line
```powershell
# Dari Windows
scp -r d:\project\dataanalis user@vps-ip:/opt/
```

#### C. Via Git
```bash
# Push ke repository
git push origin main

# Di VPS
ssh user@vps-ip
cd /opt
git clone https://your-repo.git dataanalis
```

### Step 3: Deploy! (2 menit)

```bash
# SSH ke VPS
ssh user@vps-ip

# Navigate
cd /opt/dataanalis

# Set permissions
chmod +x *.sh

# Deploy
./deploy.sh

# Verify
./healthcheck.sh
```

**Done!** Akses aplikasi di: `http://vps-ip:3010`

## 📋 Pre-Deployment Checklist

### ✅ Prerequisites

#### VPS Requirements
- [ ] Docker installed (20.x+)
  ```bash
  docker --version
  ```
- [ ] Docker Compose installed (v2.x+)
  ```bash
  docker-compose --version
  ```
- [ ] Minimal 2GB RAM available
  ```bash
  free -h
  ```
- [ ] Minimal 5GB disk space
  ```bash
  df -h
  ```
- [ ] Ports 3010, 5010, 3309 available
  ```bash
  sudo netstat -tulpn | grep -E '3010|5010|3309'
  # Should return empty
  ```

#### Files Ready
- [ ] All deployment files present (20 files)
- [ ] `.env.production` edited with correct values
- [ ] Backend and Frontend code ready
- [ ] Database schemas available

### ✅ Configuration

#### Must Change in `.env.production`
- [ ] `DB_PASSWORD` - Strong password
- [ ] `DB_ROOT_PASSWORD` - Strong root password
- [ ] `JWT_ACCESS_SECRET` - Random 32+ chars
- [ ] `JWT_REFRESH_SECRET` - Random 32+ chars
- [ ] `ACCURATE_REDIRECT_URI` - Your VPS IP/domain
- [ ] `NEXT_PUBLIC_API_URL` - Your VPS IP/domain

#### Optional (Accurate Online)
- [ ] `ACCURATE_CLIENT_ID` - If you have it
- [ ] `ACCURATE_CLIENT_SECRET` - If you have it
- [ ] `ACCURATE_MOCK` - Set to `false` for production

### ✅ Security

- [ ] Firewall configured
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw allow 3010/tcp
  sudo ufw allow 5010/tcp
  sudo ufw enable
  ```
- [ ] SSH key authentication (recommended)
- [ ] .env.production permissions: 600
  ```bash
  chmod 600 .env.production
  ```
- [ ] Strong passwords set
- [ ] HTTPS planned (optional but recommended)

## 🎮 Available Scripts

### Linux/Unix Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| deploy.sh | Deploy production | `./deploy.sh` |
| healthcheck.sh | Health monitoring | `./healthcheck.sh` |
| backup.sh | Database backup | `./backup.sh` |
| setup-cron-backup.sh | Auto backup | `./setup-cron-backup.sh` |
| Makefile | Quick commands | `make prod` |

### Windows Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| deploy.bat | Deploy production | `deploy.bat` |
| healthcheck.bat | Health check | `healthcheck.bat` |
| backup.bat | Database backup | `backup.bat` |
| quick-commands.bat | Interactive menu | `quick-commands.bat` |

## 🔧 Management Commands

### Start/Stop

```bash
# Start
docker-compose --env-file .env.production up -d

# Stop
docker-compose --env-file .env.production down

# Restart
docker-compose --env-file .env.production restart

# Restart single service
docker restart dataanalis-api
```

### Logs

```bash
# All services
docker-compose --env-file .env.production logs -f

# Specific service
docker logs -f dataanalis-web
docker logs -f dataanalis-api
docker logs -f dataanalis-mysql

# Last 100 lines
docker logs --tail 100 dataanalis-api
```

### Status

```bash
# Container status
docker ps | grep dataanalis

# Resource usage
docker stats | grep dataanalis

# Health check
./healthcheck.sh
```

## 🆘 Quick Troubleshooting

### Issue: Port Already in Use

```bash
# Check what's using the port
sudo netstat -tulpn | grep 3010

# Solution: Ports sudah dipilih yang unik
# Jika masih bentrok, edit docker-compose.yml
```

### Issue: Container Won't Start

```bash
# Check logs
docker logs dataanalis-api

# Check resource
docker stats

# Restart
docker restart dataanalis-api
```

### Issue: Database Connection Failed

```bash
# Check database logs
docker logs dataanalis-mysql

# Restart database
docker restart dataanalis-mysql

# Check credentials in .env.production
```

### Issue: Frontend Can't Connect to Backend

```bash
# Check NEXT_PUBLIC_API_URL in .env.production
# Should be: http://YOUR_VPS_IP:5010/api

# Rebuild frontend
docker-compose --env-file .env.production up -d --build dataanalis-frontend
```

## 🎯 Deployment Workflow

```
┌─────────────────────────────────────────┐
│ 1. Edit .env.production                 │
│    - Database passwords                 │
│    - JWT secrets                        │
│    - API configuration                  │
│    - Domain/IP settings                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Upload to VPS                        │
│    - SCP / Git / FTP                    │
│    - To: /opt/dataanalis/               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Set Permissions                      │
│    chmod +x *.sh                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Deploy                               │
│    ./deploy.sh                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 5. Verify                               │
│    ./healthcheck.sh                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 6. Access Application                   │
│    http://vps-ip:3010                   │
│    ✅ Ready!                            │
└─────────────────────────────────────────┘
```

## 📖 Documentation Map

**Bingung harus baca yang mana? Ikuti flow ini:**

### Untuk Pemula
```
1. START-HERE.md (you are here) ← Baca dulu
2. QUICKSTART.md ← Deploy cepat
3. UPLOAD-TO-VPS.md ← Cara upload
4. README.DEPLOYMENT.md ← Troubleshooting detail
```

### Untuk Developer
```
1. README.md ← Overview & API docs
2. DEPLOYMENT-DIAGRAM.md ← Architecture
3. FILES-CREATED.md ← File reference
4. DEPLOYMENT-SUMMARY.md ← Configuration
```

### Untuk DevOps
```
1. README.DEPLOYMENT.md ← Full deployment
2. DEPLOYMENT-DIAGRAM.md ← System architecture
3. Makefile ← Quick commands
4. nginx.conf ← Reverse proxy
```

## 🎓 Learning Path

### Day 1: Basic Deployment
- [ ] Read QUICKSTART.md
- [ ] Edit .env.production
- [ ] Upload to VPS
- [ ] Deploy with ./deploy.sh
- [ ] Access application

### Day 2: Configuration & Security
- [ ] Setup firewall
- [ ] Configure backup (./backup.sh)
- [ ] Setup auto backup (cron)
- [ ] Monitor with ./healthcheck.sh

### Day 3: Advanced Setup
- [ ] Setup domain (optional)
- [ ] Configure Nginx reverse proxy
- [ ] Enable HTTPS with Let's Encrypt
- [ ] Setup monitoring

## 🌟 Best Practices

### ✅ Do's
- ✅ Change all default passwords
- ✅ Use strong JWT secrets (32+ chars)
- ✅ Setup firewall
- ✅ Regular backups
- ✅ Monitor logs regularly
- ✅ Use HTTPS in production
- ✅ Keep Docker images updated

### ❌ Don'ts
- ❌ Don't commit .env.production to Git
- ❌ Don't use default passwords
- ❌ Don't expose database port publicly
- ❌ Don't skip security updates
- ❌ Don't ignore error logs

## 🎉 Success Indicators

Your deployment is successful when:

- [ ] ✅ All containers running
  ```bash
  docker ps | grep dataanalis
  # Should show 3 containers: web, api, mysql
  ```

- [ ] ✅ Health check passes
  ```bash
  ./healthcheck.sh
  # Should show all green checkmarks
  ```

- [ ] ✅ Frontend accessible
  ```bash
  curl http://vps-ip:3010
  # Should return HTML
  ```

- [ ] ✅ Backend API responding
  ```bash
  curl http://vps-ip:5010/api/health
  # Should return success
  ```

- [ ] ✅ Database connected
  ```bash
  docker exec dataanalis-mysql mysql -u root -p -e "SHOW DATABASES;"
  # Should list dataanalis database
  ```

## 📞 Getting Help

### Self-Service
1. Check [QUICKSTART.md](QUICKSTART.md) troubleshooting section
2. Run `./healthcheck.sh` to diagnose
3. Check logs: `docker logs dataanalis-api`
4. Review [README.DEPLOYMENT.md](README.DEPLOYMENT.md)

### Documentation Reference
- Architecture: [DEPLOYMENT-DIAGRAM.md](DEPLOYMENT-DIAGRAM.md)
- All files: [FILES-CREATED.md](FILES-CREATED.md)
- Upload help: [UPLOAD-TO-VPS.md](UPLOAD-TO-VPS.md)

### Common Commands
```bash
# Check status
docker ps | grep dataanalis

# View logs
docker logs -f dataanalis-api

# Restart service
docker restart dataanalis-api

# Full health check
./healthcheck.sh

# Backup database
./backup.sh
```

## 🚀 Ready to Deploy?

### Your Next 3 Actions:

1. **Edit Configuration** (5 min)
   ```bash
   notepad .env.production
   ```

2. **Upload to VPS** (10 min)
   - Choose method from [UPLOAD-TO-VPS.md](UPLOAD-TO-VPS.md)

3. **Deploy!** (2 min)
   ```bash
   ssh user@vps-ip
   cd /opt/dataanalis
   chmod +x *.sh
   ./deploy.sh
   ```

**That's it!** Your application will be live at `http://vps-ip:3010`

---

## 📊 Project Status

- **Version**: 1.0.0
- **Status**: ✅ **PRODUCTION READY**
- **Deployment Files**: 21 files created
- **Port Conflicts**: ✅ None (verified against existing apps)
- **Container Names**: ✅ Unique (dataanalis-*)
- **Security**: ✅ Configured
- **Documentation**: ✅ Complete
- **Scripts**: ✅ Cross-platform (Linux & Windows)

---

**🎯 Mulai sekarang! Buka [QUICKSTART.md](QUICKSTART.md) untuk deploy dalam 5 menit!**

**❓ Ada pertanyaan? Lihat dokumentasi lainnya atau jalankan `./healthcheck.sh`**

**✅ Semua sudah disiapkan. Tinggal deploy!**
