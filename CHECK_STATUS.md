# 🔍 Troubleshooting: Tidak Bisa Ambil Data dari Accurate

## Error yang Terlihat:
- ❌ 401 Unauthorized
- ❌ CORS errors
- ❌ 500 Internal Server Error

## Checklist Diagnosa:

### ✅ 1. Cek Backend Running
```bash
ssh root@145.79.8.148
docker ps | grep dataanalis_backend
```
**Expected:** Container status `Up`

---

### ✅ 2. Cek Backend Logs
```bash
docker logs dataanalis_backend --tail 100 | grep -i error
```
Lihat error apa yang muncul

---

### ✅ 3. Cek Health Endpoint
```bash
curl http://145.79.8.148:5010/health
```
**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "environment": "production",
  "mockMode": false
}
```

❌ **Jika mockMode: true** → Backend masih mode testing!

---

### ✅ 4. Cek Environment Variables
```bash
cat /opt/analis/backend/.env | grep ACCURATE
```
**Harus ada:**
```
ACCURATE_MOCK=false
ACCURATE_CLIENT_ID="[your_client_id]"
ACCURATE_CLIENT_SECRET="[your_client_secret]"
ACCURATE_REDIRECT_URI="http://145.79.8.148:5010/api/sync/callback"
```

---

### ✅ 5. Cek Database Settings
```bash
docker exec -it dataanalis_backend npx prisma studio
```
atau langsung query:
```bash
docker exec -it dataanalis_backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.setting.findMany().then(console.log);
"
```

Cari:
- `ACCURATE_CLIENT_ID`
- `ACCURATE_CLIENT_SECRET`  
- `ACCURATE_ACCESS_TOKEN`
- `ACCURATE_DB_ID`

---

### ✅ 6. Test Manual API Call
```bash
# Test jika Accurate sudah terkoneksi
curl -X POST http://145.79.8.148:5010/api/sync/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"moduleName": "Barang & Jasa"}'
```

---

## Kemungkinan Masalah & Solusi:

### 🔴 Masalah 1: ACCURATE_MOCK masih true

**Cek:**
```bash
cat /opt/analis/backend/.env | grep ACCURATE_MOCK
```

**Solusi:**
```bash
ssh root@145.79.8.148
cd /opt/analis/backend
nano .env
# Ubah ACCURATE_MOCK=true menjadi ACCURATE_MOCK=false
# Save (Ctrl+O, Enter, Ctrl+X)
cd /opt/analis
docker compose restart backend
```

---

### 🔴 Masalah 2: Credentials Belum Di-input

**Solusi:**
1. Login ke app: http://145.79.8.148:3010/settings
2. Masukkan Client ID dan Client Secret
3. Klik "Simpan Kredensial"
4. Klik "Hubungkan dengan Accurate"
5. Approve OAuth
6. Pilih database

---

### 🔴 Masalah 3: Token Expired

**Solusi:**
1. Logout dari aplikasi
2. Login ulang
3. Coba sync lagi

---

### 🔴 Masalah 4: Database Belum Dipilih

Setelah OAuth berhasil, **WAJIB** pilih database perusahaan!

**Cek apakah DB sudah dipilih:**
```bash
docker exec -it dataanalis_backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.setting.findFirst({ where: { key: 'ACCURATE_DB_ID' } }).then(console.log);
"
```

---

### 🔴 Masalah 5: CORS Error

**Sudah diperbaiki!** Akan di-deploy di update berikutnya.

Jika masih muncul, clear browser cache:
- Chrome: Ctrl+Shift+Del → Clear All
- Firefox: Ctrl+Shift+Del → Clear All

---

## Quick Fix Script

Jalankan ini di VPS untuk reset dan setup ulang:

```bash
ssh root@145.79.8.148 << 'ENDSSH'

# 1. Stop containers
cd /opt/analis
docker compose down

# 2. Update .env
cat > backend/.env << 'EOF'
PORT=5000
NODE_ENV=production

# Database Connection (MySQL)
DATABASE_URL="mysql://root:@localhost:3306/dataanalis"

# JWT Security Secrets
JWT_ACCESS_SECRET="dataanalis_access_secret_key_change_me_in_production_9988"
JWT_REFRESH_SECRET="dataanalis_refresh_secret_key_change_me_in_production_7766"

# Encryption Key (Must be 32 bytes / 64 hex characters)
ENCRYPTION_KEY="e9ca72b146473e659357a7dbd8bc4b6845cb067756f7efb0f443b71c4c16a8b1"

# Accurate Online API (OAuth2) Configuration
ACCURATE_MOCK=false
ACCURATE_CLIENT_ID=""
ACCURATE_CLIENT_SECRET=""
ACCURATE_REDIRECT_URI="http://145.79.8.148:5010/api/sync/callback"

# Frontend URL
FRONTEND_URL="http://145.79.8.148:3010"
EOF

# 3. Pull latest code
git pull origin main

# 4. Rebuild and start
docker compose up --build -d

# 5. Check status
sleep 5
docker ps | grep dataanalis

# 6. Check health
curl http://localhost:5010/health

echo "✅ Setup complete! Now go to http://145.79.8.148:3010/settings"
echo "   1. Input Client ID and Secret"
echo "   2. Click 'Hubungkan dengan Accurate'"
echo "   3. Approve OAuth"
echo "   4. Select database"
echo "   5. Try sync again"

ENDSSH
```

---

## Masih Error?

**Ambil screenshot dan kirim info berikut:**

1. Screenshot error di browser console
2. Output dari:
   ```bash
   docker logs dataanalis_backend --tail 100
   ```
3. Output dari:
   ```bash
   curl http://145.79.8.148:5010/health
   ```
4. Konfirmasi apakah sudah:
   - ✅ Input Client ID & Secret di Settings
   - ✅ Klik "Hubungkan dengan Accurate"
   - ✅ Approve OAuth
   - ✅ Pilih database perusahaan
