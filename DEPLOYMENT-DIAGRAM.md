# 🏗️ DataAnalis - Deployment Architecture

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS Server                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                 Docker Network                          │   │
│  │              (dataanalis-network)                       │   │
│  │                                                          │   │
│  │  ┌──────────────────┐  ┌──────────────────┐           │   │
│  │  │   Frontend       │  │    Backend       │           │   │
│  │  │   (Next.js)      │  │   (Express)      │           │   │
│  │  │                  │  │                  │           │   │
│  │  │ Container:       │  │ Container:       │           │   │
│  │  │ dataanalis-web   │  │ dataanalis-api   │           │   │
│  │  │                  │  │                  │           │   │
│  │  │ Port: 3000       │◄─┤ Port: 5000       │           │   │
│  │  │ (Internal)       │  │ (Internal)       │           │   │
│  │  └────────┬─────────┘  └────────┬─────────┘           │   │
│  │           │                     │                      │   │
│  │           │                     │                      │   │
│  │           │                     ▼                      │   │
│  │           │            ┌──────────────────┐           │   │
│  │           │            │    Database      │           │   │
│  │           │            │    (MySQL 8.0)   │           │   │
│  │           │            │                  │           │   │
│  │           │            │ Container:       │           │   │
│  │           │            │ dataanalis-mysql │           │   │
│  │           │            │                  │           │   │
│  │           │            │ Port: 3306       │           │   │
│  │           │            │ (Internal)       │           │   │
│  │           │            └──────────────────┘           │   │
│  │           │                                            │   │
│  └───────────┼────────────────────────────────────────────┘   │
│              │                                                 │
│       ┌──────┴────────┐                                       │
│       │  Port Mapping │                                       │
│       │               │                                       │
│       │  3010 ──► 3000  (Frontend)                           │
│       │  5010 ──► 5000  (Backend)                            │
│       │  3309 ──► 3306  (MySQL)                              │
│       └───────────────┘                                       │
│                                                                │
└──────────────────┬─────────────────────────────────────────────┘
                   │
                   │ Firewall Rules
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌─────────┐         ┌──────────┐
   │  User   │         │  Admin   │
   │ Browser │         │   SSH    │
   └─────────┘         └──────────┘
   Port 3010           Port 22
   Port 5010
```

## 🔌 Port Mapping Detail

```
┌─────────────────────────────────────────────────────────┐
│                    Port Configuration                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Service          Internal    External    Status        │
│  ─────────────────────────────────────────────────      │
│  Frontend         3000   →    3010        ✅ Available  │
│  Backend          5000   →    5010        ✅ Available  │
│  MySQL            3306   →    3309        ✅ Available  │
│                                                          │
│  Ports Used by Existing Apps (Avoided):                 │
│  ───────────────────────────────────────                │
│  ❌ 3000, 3308, 3360, 5000, 5001, 5002,                │
│     5006, 5066, 8090, 8092                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🌐 Network Flow

```
User Request Flow:
═════════════════

1. Frontend Access:
   User Browser → http://vps-ip:3010
                ↓
   VPS Port 3010 → Container Port 3000
                ↓
   Next.js App renders page

2. API Request:
   User Browser → http://vps-ip:3010
                ↓
   Frontend (Next.js) → http://localhost:5010/api
                      ↓
   VPS Port 5010 → Container Port 5000
                ↓
   Express API processes request
                ↓
   MySQL (Port 3306 internal) ← Database Query
                ↓
   Response back to Frontend
                ↓
   User Browser receives data

3. Database Access (Internal Only):
   Backend Container → dataanalis-mysql:3306
                    ↓
   MySQL Container processes query
                    ↓
   Response to Backend
```

## 🔒 Security Layers

```
┌─────────────────────────────────────────────────────┐
│              Security Architecture                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Layer 1: Firewall (VPS Level)                      │
│  ────────────────────────────                       │
│  ✓ Allow: 22 (SSH), 3010, 5010                      │
│  ✓ Deny: Direct database access (3309)              │
│                                                      │
│  Layer 2: Docker Network Isolation                  │
│  ──────────────────────────────────                 │
│  ✓ Containers in private network                    │
│  ✓ Database accessible only from containers         │
│  ✓ No direct external access to DB                  │
│                                                      │
│  Layer 3: Application Security                      │
│  ─────────────────────────────                      │
│  ✓ JWT Authentication                               │
│  ✓ 2FA Support                                      │
│  ✓ Password Hashing (bcrypt)                        │
│  ✓ Token Encryption (AES-256)                       │
│  ✓ Rate Limiting                                    │
│  ✓ CORS Configuration                               │
│  ✓ Helmet Security Headers                          │
│                                                      │
│  Layer 4: Data Encryption                           │
│  ────────────────────────                           │
│  ✓ OAuth tokens encrypted at rest                   │
│  ✓ Sensitive data hashed                            │
│  ✓ SSL/TLS for HTTPS (optional)                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 📁 File Structure & Purpose

```
dataanalis/
│
├── 🐳 Docker Configs
│   ├── docker-compose.yml          ← Production orchestration
│   ├── docker-compose.dev.yml      ← Development with hot-reload
│   ├── .dockerignore               ← Build optimization
│   └── nginx.conf                  ← Reverse proxy (optional)
│
├── ⚙️ Environment
│   ├── .env.production             ← Production variables ⚠️
│   └── .gitignore                  ← Git exclusions
│
├── 🚀 Deployment Scripts (Linux)
│   ├── deploy.sh                   ← Main deploy
│   ├── healthcheck.sh              ← Health monitoring
│   ├── backup.sh                   ← Database backup
│   ├── setup-cron-backup.sh        ← Auto backup setup
│   └── Makefile                    ← Quick commands
│
├── 🪟 Deployment Scripts (Windows)
│   ├── deploy.bat                  ← Windows deploy
│   ├── healthcheck.bat             ← Windows health check
│   ├── backup.bat                  ← Windows backup
│   └── quick-commands.bat          ← Interactive menu
│
├── 📚 Documentation
│   ├── README.md                   ← Main documentation
│   ├── QUICKSTART.md               ← Quick start guide
│   ├── README.DEPLOYMENT.md        ← Full deployment guide
│   ├── DEPLOYMENT-SUMMARY.md       ← Summary & checklist
│   ├── FILES-CREATED.md            ← File inventory
│   └── DEPLOYMENT-DIAGRAM.md       ← This file
│
├── 💾 Backend
│   ├── src/                        ← Source code
│   ├── prisma/                     ← Database schema
│   ├── logs/                       ← Application logs
│   ├── Dockerfile                  ← Backend container
│   └── package.json                ← Dependencies
│
├── 🎨 Frontend
│   ├── src/                        ← Next.js source
│   ├── public/                     ← Static assets
│   ├── Dockerfile                  ← Frontend container
│   └── package.json                ← Dependencies
│
└── 🗄️ Database
    ├── schema.sql                  ← Database schema
    └── migration_*.sql             ← Migrations
```

## 🔄 Deployment Workflow

```
┌──────────────────────────────────────────────────────┐
│            Deployment Process Flow                    │
└──────────────────────────────────────────────────────┘

Step 1: Preparation
═══════════════════
┌─────────────────────────────┐
│ Edit .env.production        │
│ - Database passwords        │
│ - JWT secrets               │
│ - Accurate API config       │
│ - Domain/IP settings        │
└──────────┬──────────────────┘
           │
           ▼
Step 2: Upload to VPS
═══════════════════════
┌─────────────────────────────┐
│ SCP or Git Clone            │
│ /opt/dataanalis/            │
└──────────┬──────────────────┘
           │
           ▼
Step 3: Execute Deploy Script
════════════════════════════════
┌─────────────────────────────┐
│ ./deploy.sh (Linux)         │
│ deploy.bat (Windows)        │
│                             │
│ → Load environment vars     │
│ → Check Docker running      │
│ → Stop old containers       │
│ → Build new images          │
│ → Start containers          │
│ → Wait for health checks    │
└──────────┬──────────────────┘
           │
           ▼
Step 4: Verification
══════════════════════
┌─────────────────────────────┐
│ ./healthcheck.sh            │
│                             │
│ → Check containers running  │
│ → Test database connection  │
│ → Test backend API          │
│ → Test frontend access      │
│ → Show resource usage       │
└──────────┬──────────────────┘
           │
           ▼
Step 5: Access Application
═════════════════════════════
┌─────────────────────────────┐
│ Frontend: http://IP:3010    │
│ Backend: http://IP:5010/api │
│                             │
│ ✅ Ready for Use!           │
└─────────────────────────────┘
```

## 🔧 Container Lifecycle

```
Container States:
═════════════════

┌─────────┐
│ CREATED │  ← Initial state after docker-compose up
└────┬────┘
     │
     ▼
┌─────────┐
│STARTING │  ← Containers initializing
└────┬────┘
     │
     ▼
┌─────────┐
│HEALTHY  │  ← Database health check passed ✅
└────┬────┘
     │
     ▼
┌─────────┐
│RUNNING  │  ← All services operational ✅
└────┬────┘
     │
     │ (on error or stop)
     │
     ▼
┌─────────┐
│STOPPED  │  ← Graceful shutdown
└─────────┘

Auto-restart Policy:
───────────────────
✓ unless-stopped → Containers restart automatically
                   unless explicitly stopped

Health Checks:
─────────────
MySQL: mysqladmin ping every 10s
       → 5 retries before marked unhealthy
```

## 📊 Data Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│              Data Synchronization Flow                │
└──────────────────────────────────────────────────────┘

Accurate Online API
       │
       │ OAuth2 Authentication
       │
       ▼
┌────────────────┐
│   Backend API  │
│  (dataanalis-  │
│      api)      │
└───────┬────────┘
        │
        │ Cron Job (Every X hours)
        │
        ▼
┌────────────────┐
│  Sync Service  │
│  - Fetch data  │
│  - Transform   │
│  - Validate    │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  MySQL DB      │
│  (dataanalis-  │
│    mysql)      │
│                │
│  Tables:       │
│  - customers   │
│  - products    │
│  - sales       │
│  - invoices    │
└───────┬────────┘
        │
        │ Query
        │
        ▼
┌────────────────┐
│  API Endpoints │
└───────┬────────┘
        │
        │ HTTP Request
        │
        ▼
┌────────────────┐
│   Frontend     │
│  (dataanalis-  │
│     web)       │
│                │
│  Components:   │
│  - Dashboard   │
│  - Reports     │
│  - Analytics   │
└────────────────┘
```

## 🎯 Quick Reference

### Service URLs
```
Frontend:    http://your-vps-ip:3010
Backend API: http://your-vps-ip:5010/api
MySQL:       your-vps-ip:3309 (internal only)
```

### Container Names
```
dataanalis-web      (Frontend)
dataanalis-api      (Backend)
dataanalis-mysql    (Database)
```

### Docker Network
```
Network Name: dataanalis-network
Driver: bridge
Isolation: Internal communication
```

### Volume Mounts
```
dataanalis-mysql-data  → MySQL persistent storage
backend/logs           → Application logs
```

## 🆘 Quick Troubleshooting

```
Problem          Solution
───────          ────────
Port conflict    → Ports 3010, 5010, 3309 are unique
                  Check: netstat -tulpn | grep PORT

Database down    → Auto health check & restart enabled
                  Check: docker logs dataanalis-mysql

API not responding → Check backend logs
                     docker logs dataanalis-api

Frontend 502     → Backend might not be ready yet
                  Wait 10-30 seconds after deploy
                  
All services down → Run: ./healthcheck.sh
                   Or: docker-compose ps
```

---

**Architecture Status:** ✅ Production Ready  
**Last Updated:** June 17, 2026  
**Deployment Model:** Docker Compose Multi-Container
