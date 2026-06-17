# 📤 Cara Upload Project ke VPS

## Metode 1: Upload via SCP (Recommended)

### A. Dari Windows ke Linux VPS

```powershell
# 1. Buka PowerShell di directory project
cd d:\project\dataanalis

# 2. Upload seluruh project
scp -r . user@vps-ip:/opt/dataanalis/

# Contoh:
scp -r . root@103.123.45.67:/opt/dataanalis/
```

### B. Upload File Tertentu Saja

```powershell
# Upload hanya file deployment (lebih cepat)
scp docker-compose.yml user@vps-ip:/opt/dataanalis/
scp docker-compose.dev.yml user@vps-ip:/opt/dataanalis/
scp .env.production user@vps-ip:/opt/dataanalis/
scp deploy.sh user@vps-ip:/opt/dataanalis/
scp healthcheck.sh user@vps-ip:/opt/dataanalis/
scp backup.sh user@vps-ip:/opt/dataanalis/
scp nginx.conf user@vps-ip:/opt/dataanalis/
```

### C. Upload via WinSCP (GUI)

1. Download WinSCP: https://winscp.net/
2. Install dan buka WinSCP
3. Connect ke VPS:
   - Host: `your-vps-ip`
   - Port: `22`
   - Username: `root` atau user lain
   - Password: password VPS
4. Drag & drop folder `dataanalis` ke `/opt/`

## Metode 2: Upload via Git (Professional)

### Setup Git Repository

```powershell
# 1. Inisialisasi git (jika belum)
cd d:\project\dataanalis
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial deployment setup"

# 4. Add remote (GitHub, GitLab, Bitbucket, dll)
git remote add origin https://github.com/username/dataanalis.git

# 5. Push
git push -u origin main
```

### Clone di VPS

```bash
# SSH ke VPS
ssh user@vps-ip

# Clone repository
cd /opt
git clone https://github.com/username/dataanalis.git
cd dataanalis
```

**⚠️ PENTING:** Jangan commit file `.env.production` ke Git public!
Gunakan `.env.example` saja, lalu buat `.env.production` manual di VPS.

## Metode 3: Upload via FTP/SFTP

### Menggunakan FileZilla

1. Download FileZilla: https://filezilla-project.org/
2. Install dan buka FileZilla
3. Connect:
   - Host: `sftp://vps-ip`
   - Username: `root`
   - Password: password VPS
   - Port: `22`
4. Upload folder `dataanalis` ke `/opt/`

## Metode 4: Compress & Upload (Untuk koneksi lambat)

### Windows

```powershell
# 1. Compress project (exclude node_modules)
Compress-Archive -Path "d:\project\dataanalis\*" -DestinationPath "dataanalis.zip" -Force

# 2. Upload zip file
scp dataanalis.zip user@vps-ip:/opt/

# 3. Extract di VPS
ssh user@vps-ip
cd /opt
unzip dataanalis.zip
```

### Linux (di VPS)

```bash
# Jika file sudah di VPS
cd /opt
unzip dataanalis.zip
# atau
tar -xzf dataanalis.tar.gz
```

## 📋 Checklist Setelah Upload

### 1. Verifikasi File

```bash
# SSH ke VPS
ssh user@vps-ip

# Check directory
cd /opt/dataanalis
ls -la

# Expected files:
# - docker-compose.yml
# - docker-compose.dev.yml
# - .env.production
# - deploy.sh
# - healthcheck.sh
# - backup.sh
# - nginx.conf
# - backend/
# - frontend/
# - database/
```

### 2. Set Permissions

```bash
# Berikan execute permission untuk scripts
chmod +x deploy.sh
chmod +x healthcheck.sh
chmod +x backup.sh
chmod +x setup-cron-backup.sh

# Verify
ls -la *.sh
```

### 3. Edit Environment

```bash
# Edit dengan nano atau vim
nano .env.production

# Atau edit lokal lalu upload ulang
```

### 4. Verify Docker

```bash
# Check Docker installed
docker --version
docker-compose --version

# Check Docker running
docker ps
```

## 🚀 Deploy Setelah Upload

```bash
# 1. SSH ke VPS
ssh user@vps-ip

# 2. Navigate to project
cd /opt/dataanalis

# 3. Edit environment (WAJIB!)
nano .env.production
# Ubah:
# - DB_PASSWORD
# - JWT_SECRETS
# - ACCURATE_REDIRECT_URI (ganti dengan IP VPS)
# - NEXT_PUBLIC_API_URL (ganti dengan IP VPS)

# 4. Set permissions
chmod +x *.sh

# 5. Deploy!
./deploy.sh

# 6. Verify
./healthcheck.sh

# 7. Check logs
docker logs -f dataanalis-web
docker logs -f dataanalis-api
docker logs -f dataanalis-mysql
```

## 🔐 Security Best Practices

### 1. Protect Sensitive Files

```bash
# Set restrictive permissions untuk .env
chmod 600 .env.production

# Only owner can read/write
ls -la .env.production
# Should show: -rw------- 1 root root
```

### 2. Don't Upload to Public Git

**.gitignore** already includes:
```gitignore
.env
.env.production
.env.local
*.env
```

### 3. Use SSH Keys (Recommended)

```powershell
# Generate SSH key (Windows)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to VPS
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh user@vps-ip "cat >> ~/.ssh/authorized_keys"

# Now you can SSH without password
ssh user@vps-ip
```

## 📦 File Size Considerations

### Typical Sizes

```
Full Project (with node_modules): ~500 MB
Without node_modules: ~50 MB
Deployment files only: ~1 MB

Recommendation:
- Upload without node_modules
- Let Docker build install dependencies
```

### Exclude from Upload

Sudah ada di `.dockerignore`:
- `node_modules/`
- `.git/`
- `logs/`
- `.next/`
- `dist/`
- `*.log`

## 🔄 Update Strategy

### Quick Update (Code changes only)

```bash
# Method 1: Git pull
ssh user@vps-ip
cd /opt/dataanalis
git pull origin main
./deploy.sh

# Method 2: SCP specific files
scp backend/src/controllers/userController.ts user@vps-ip:/opt/dataanalis/backend/src/controllers/
ssh user@vps-ip "cd /opt/dataanalis && ./deploy.sh"
```

### Full Redeploy

```bash
# Backup first
./backup.sh

# Stop services
docker-compose --env-file .env.production down

# Upload new version
# (use any method above)

# Deploy
./deploy.sh
```

## 🆘 Troubleshooting Upload

### Problem: Permission Denied

```bash
# Solution 1: Use sudo
sudo scp -r . user@vps-ip:/opt/dataanalis/

# Solution 2: Change directory ownership
ssh user@vps-ip
sudo chown -R $USER:$USER /opt/dataanalis
```

### Problem: Connection Refused

```bash
# Check SSH service
ssh user@vps-ip "sudo systemctl status sshd"

# Check firewall
ssh user@vps-ip "sudo ufw status"

# Make sure port 22 is open
ssh user@vps-ip "sudo ufw allow 22"
```

### Problem: Slow Upload

```bash
# Use compression
tar -czf dataanalis.tar.gz dataanalis/
scp dataanalis.tar.gz user@vps-ip:/opt/

# Extract on server
ssh user@vps-ip "cd /opt && tar -xzf dataanalis.tar.gz"
```

### Problem: Files Missing After Upload

```bash
# Check .gitignore and .dockerignore
# They might be excluding files

# Use -a flag to preserve all
scp -r -a . user@vps-ip:/opt/dataanalis/
```

## 📝 Quick Command Reference

### Upload Commands

```bash
# Full upload
scp -r dataanalis/ user@vps-ip:/opt/

# Single file
scp file.txt user@vps-ip:/opt/dataanalis/

# Multiple files
scp file1.txt file2.txt user@vps-ip:/opt/dataanalis/

# With compression
scp -C -r dataanalis/ user@vps-ip:/opt/

# Preserve permissions
scp -r -p dataanalis/ user@vps-ip:/opt/
```

### Download from VPS (Backup)

```bash
# Download file
scp user@vps-ip:/opt/dataanalis/backup.sql ./

# Download folder
scp -r user@vps-ip:/opt/dataanalis/backups/ ./

# Download with timestamp
scp user@vps-ip:/opt/dataanalis/backup.sql ./backup_$(date +%Y%m%d).sql
```

## ✅ Upload Checklist

- [ ] Project files ready
- [ ] `.env.production` configured
- [ ] `node_modules/` excluded
- [ ] VPS accessible via SSH
- [ ] Upload completed successfully
- [ ] Files verified on VPS
- [ ] Permissions set (`chmod +x *.sh`)
- [ ] Docker installed on VPS
- [ ] Firewall configured
- [ ] Ready to deploy!

## 🎯 Next Steps After Upload

1. **SSH to VPS**: `ssh user@vps-ip`
2. **Navigate**: `cd /opt/dataanalis`
3. **Set permissions**: `chmod +x *.sh`
4. **Edit environment**: `nano .env.production`
5. **Deploy**: `./deploy.sh`
6. **Verify**: `./healthcheck.sh`
7. **Access**: `http://vps-ip:3010`

---

**Ready to Upload?** Choose the method that works best for you!

**Recommended for beginners:** WinSCP (GUI) or FileZilla  
**Recommended for developers:** Git + SSH  
**Recommended for quick updates:** SCP command line
