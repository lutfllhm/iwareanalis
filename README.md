# 📊 DataAnalis - Accurate Online Dashboard

Aplikasi Dashboard Analisis Data untuk Accurate Online dengan fitur OAuth2, data synchronization, dan reporting yang lengkap.

## 🎯 Features

- ✅ OAuth2 Integration dengan Accurate Online
- ✅ Automatic Data Synchronization
- ✅ Real-time Analytics Dashboard
- ✅ Multi-report Generation (PDF, Excel)
- ✅ User Authentication & Authorization
- ✅ Two-Factor Authentication (2FA)
- ✅ Responsive Design
- ✅ RESTful API Backend

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API Server
- **TypeScript** - Type-safe development
- **Prisma ORM** - Database management
- **MySQL 8.0** - Database
- **JWT** - Authentication
- **Winston** - Logging

### Frontend
- **Next.js 16** - React Framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **TanStack Query** - Data fetching
- **Recharts** - Data visualization
- **Axios** - HTTP client

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy (optional)

## 📦 Project Structure

```
dataanalis/
├── backend/                # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── middlewares/   # Auth, validation middlewares
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── app.ts         # App entry point
│   ├── prisma/            # Database schema & migrations
│   ├── logs/              # Application logs
│   └── Dockerfile
│
├── frontend/              # Frontend (Next.js)
│   ├── src/
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # React components
│   │   ├── lib/          # Utils & helpers
│   │   └── types/        # TypeScript types
│   └── Dockerfile
│
├── database/             # Database schemas & migrations
│   ├── schema.sql
│   └── migration_*.sql
│
├── accurate/             # Accurate API documentation
│
├── docker-compose.yml           # Production configuration
├── docker-compose.dev.yml       # Development configuration
├── .env.production              # Production environment
├── deploy.sh / deploy.bat       # Deployment scripts
├── healthcheck.sh / .bat        # Health monitoring
├── backup.sh / backup.bat       # Database backup
├── nginx.conf                   # Nginx configuration
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.x+
- Docker Compose v2.x+
- Minimal 2GB RAM
- Minimal 5GB disk space

### Development Mode

```bash
# Clone repository
git clone <repository-url>
cd dataanalis

# Start development
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

Access:
- Frontend: http://localhost:3010
- Backend API: http://localhost:5010/api
- MySQL: localhost:3309

### Production Deployment

Lihat dokumentasi lengkap di:
- **[QUICKSTART.md](QUICKSTART.md)** - Panduan cepat deployment
- **[README.DEPLOYMENT.md](README.DEPLOYMENT.md)** - Dokumentasi deployment lengkap
- **[DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md)** - Summary file & checklist

**Quick Deploy:**

```bash
# 1. Configure environment
cp .env.production .env.production.local
nano .env.production  # Edit dengan values yang benar

# 2. Deploy
chmod +x deploy.sh
./deploy.sh

# 3. Verify
./healthcheck.sh
```

**Windows:**

```batch
REM 1. Edit environment
notepad .env.production

REM 2. Deploy
deploy.bat

REM 3. Verify
healthcheck.bat
```

## 🔌 Port Configuration

| Service | Internal | External | Description |
|---------|----------|----------|-------------|
| Frontend | 3000 | **3010** | Next.js Web App |
| Backend | 5000 | **5010** | Express API Server |
| MySQL | 3306 | **3309** | Database Server |

> **Note:** Port eksternal dipilih untuk menghindari konflik dengan aplikasi lain di VPS.

## 🔐 Environment Variables

File `.env.production` yang perlu dikonfigurasi:

```env
# Database
DB_NAME=dataanalis
DB_USER=dataanalis_user
DB_PASSWORD=your_secure_password       # ⚠️ CHANGE THIS
DB_ROOT_PASSWORD=your_root_password    # ⚠️ CHANGE THIS

# Backend
PORT=5010
NODE_ENV=production

# JWT Security
JWT_ACCESS_SECRET=your_random_secret   # ⚠️ CHANGE THIS
JWT_REFRESH_SECRET=your_random_secret  # ⚠️ CHANGE THIS
ENCRYPTION_KEY=your_32_byte_hex_key    # ⚠️ CHANGE THIS

# Accurate Online
ACCURATE_MOCK=false                    # Set false for production
ACCURATE_CLIENT_ID=your_client_id      # From Accurate
ACCURATE_CLIENT_SECRET=your_secret     # From Accurate
ACCURATE_REDIRECT_URI=http://your-domain:3010/settings

# Frontend
NEXT_PUBLIC_API_URL=http://your-domain:5010/api
```

## 📚 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
POST   /api/auth/logout            # Logout user
POST   /api/auth/refresh-token     # Refresh access token
POST   /api/auth/2fa/setup         # Setup 2FA
POST   /api/auth/2fa/verify        # Verify 2FA code
GET    /api/auth/me                # Get current user
```

### Data Endpoints

```
GET    /api/data/barang-jasa       # Get products/services
GET    /api/data/pelanggan         # Get customers
GET    /api/data/penjualan         # Get sales data
POST   /api/sync/trigger           # Trigger manual sync
GET    /api/sync/status            # Get sync status
```

### Report Endpoints

```
POST   /api/reports/generate       # Generate report
GET    /api/reports/list           # List reports
GET    /api/reports/:id            # Get specific report
DELETE /api/reports/:id            # Delete report
```

### Analytics Endpoints

```
GET    /api/analytics/dashboard    # Dashboard analytics
GET    /api/analytics/sales        # Sales analytics
GET    /api/analytics/products     # Product analytics
```

## 🔧 Management Commands

### Using Docker Compose

```bash
# Start services
docker-compose --env-file .env.production up -d

# Stop services
docker-compose --env-file .env.production down

# Restart services
docker-compose --env-file .env.production restart

# View logs
docker-compose --env-file .env.production logs -f

# View specific service logs
docker logs -f dataanalis-web
docker logs -f dataanalis-api
docker logs -f dataanalis-mysql
```

### Using Scripts

**Linux/Unix:**
```bash
./deploy.sh              # Deploy production
./healthcheck.sh         # Health check
./backup.sh              # Database backup
make prod                # Deploy (if using Makefile)
make prod-logs           # View logs
```

**Windows:**
```batch
deploy.bat              # Deploy production
healthcheck.bat         # Health check
backup.bat              # Database backup
quick-commands.bat      # Interactive menu
```

## 💾 Database Backup & Restore

### Manual Backup

```bash
# Create backup
./backup.sh

# Or manual
docker exec dataanalis-mysql mysqldump \
  -u root -p dataanalis > backup.sql
```

### Automatic Backup (Cron)

```bash
# Setup daily backup at 2 AM
chmod +x setup-cron-backup.sh
./setup-cron-backup.sh
```

### Restore

```bash
# Decompress if gzipped
gunzip backup.sql.gz

# Restore
docker exec -i dataanalis-mysql mysql \
  -u root -p dataanalis < backup.sql
```

## 🔍 Monitoring & Debugging

### Health Check

```bash
# Run health check
./healthcheck.sh

# Manual checks
curl http://localhost:3010        # Frontend
curl http://localhost:5010/api/health  # Backend
docker exec dataanalis-mysql mysqladmin ping
```

### View Logs

```bash
# All services
docker-compose --env-file .env.production logs -f

# Specific service
docker logs -f dataanalis-api

# Backend application logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

### Resource Monitoring

```bash
# Container stats
docker stats

# Filter DataAnalis containers
docker stats | grep dataanalis

# Disk usage
docker system df
```

## 🌐 Production Setup with HTTPS

### 1. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx

# Copy configuration
sudo cp nginx.conf /etc/nginx/sites-available/dataanalis
sudo ln -s /etc/nginx/sites-available/dataanalis /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Get SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 3. Update Environment

```env
# Update .env.production
ACCURATE_REDIRECT_URI=https://yourdomain.com/settings
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

## 🛡️ Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets (32+ characters)
- [ ] Setup firewall (UFW/iptables)
- [ ] Enable HTTPS with SSL certificate
- [ ] Restrict database access to containers only
- [ ] Regular database backups
- [ ] Update Docker images regularly
- [ ] Monitor logs for suspicious activity
- [ ] Enable 2FA for all users
- [ ] Use environment-specific credentials

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs dataanalis-api

# Check resource usage
docker stats

# Restart container
docker restart dataanalis-api
```

### Database Connection Error

```bash
# Check database
docker exec dataanalis-mysql mysql -u root -p -e "SHOW DATABASES;"

# Restart database
docker restart dataanalis-mysql

# Check connection string in .env.production
```

### Port Already in Use

```bash
# Find what's using the port
sudo netstat -tulpn | grep 3010
sudo lsof -i :3010

# Change port in docker-compose.yml or kill process
```

### Reset Everything

```bash
# ⚠️ WARNING: This deletes all data!
docker-compose --env-file .env.production down -v
./deploy.sh
```

## 📖 Additional Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Quick deployment guide
- **[README.DEPLOYMENT.md](README.DEPLOYMENT.md)** - Comprehensive deployment docs
- **[DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md)** - File summary & checklist
- **Frontend README**: [frontend/README.md](frontend/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary software.

## 👥 Support

For issues and questions:
- Check documentation files
- Review logs: `docker logs [container-name]`
- Run health check: `./healthcheck.sh`
- Contact: [your-email@example.com]

## 📊 Status

- **Version**: 1.0.0
- **Status**: ✅ Production Ready
- **Last Updated**: June 17, 2026

---

**Made with ❤️ for Accurate Online Integration**
