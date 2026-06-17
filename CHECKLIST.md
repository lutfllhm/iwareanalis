# ✅ DEPLOYMENT CHECKLIST

## 📋 Pre-Deployment Checklist

### 🖥️ VPS Requirements

- [ ] Docker installed & running
  ```bash
  docker --version
  # Should show: Docker version 20.x or higher
  ```

- [ ] Docker Compose installed
  ```bash
  docker-compose --version
  # Should show: Docker Compose version 2.x or higher
  ```

- [ ] Sufficient resources available
  ```bash
  free -h          # Check RAM (need 2GB+)
  df -h            # Check disk (need 5GB+)
  ```

- [ ] Required ports available
  ```bash
  sudo netstat -tulpn | grep -E '3010|5010|3309'
  # Should return EMPTY (ports not in use)
  ```

- [ ] SSH access working
  ```bash
  ssh user@vps-ip
  # Should connect successfully
  ```

### 📝 Configuration Files

- [ ] `.env.production` exists
- [ ] Database passwords changed
  - [ ] `DB_PASSWORD` = strong password
  - [ ] `DB_ROOT_PASSWORD` = strong root password

- [ ] JWT secrets generated (32+ characters each)
  - [ ] `JWT_ACCESS_SECRET` = random string
  - [ ] `JWT_REFRESH_SECRET` = different random string

- [ ] Encryption key set (64 hex characters)
  - [ ] `ENCRYPTION_KEY` = 64 character hex string

- [ ] Domain/IP configuration
  - [ ] `ACCURATE_REDIRECT_URI` = http://YOUR-VPS-IP:3010/settings
  - [ ] `NEXT_PUBLIC_API_URL` = http://YOUR-VPS-IP:5010/api

- [ ] Accurate Online credentials (if available)
  - [ ] `ACCURATE_CLIENT_ID` set
  - [ ] `ACCURATE_CLIENT_SECRET` set
  - [ ] `ACCURATE_MOCK` = false (for production)

### 📦 Files Ready

- [ ] All deployment files present:
  ```
  ✓ docker-compose.yml
  ✓ docker-compose.dev.yml
  ✓ .env.production
  ✓ .dockerignore
  ✓ .gitignore
  ✓ nginx.conf
  ✓ deploy.sh / deploy.bat
  ✓ healthcheck.sh / healthcheck.bat
  ✓ backup.sh / backup.bat
  ✓ Backend code (backend/)
  ✓ Frontend code (frontend/)
  ✓ Database schemas (database/)
  ```

## 🚀 Deployment Steps

### Step 1: Upload to VPS

- [ ] Choose upload method:
  - [ ] Option A: WinSCP (GUI)
  - [ ] Option B: SCP command
  - [ ] Option C: Git clone

- [ ] Files uploaded to `/opt/dataanalis/`
- [ ] Verify upload:
  ```bash
  ssh user@vps-ip
  cd /opt/dataanalis
  ls -la
  ```

### Step 2: Set Permissions

- [ ] Make scripts executable:
  ```bash
  chmod +x deploy.sh
  chmod +x healthcheck.sh
  chmod +x backup.sh
  chmod +x setup-cron-backup.sh
  ```

- [ ] Verify permissions:
  ```bash
  ls -la *.sh
  # All .sh files should show -rwxr-xr-x
  ```

- [ ] Secure environment file:
  ```bash
  chmod 600 .env.production
  # Should show -rw-------
  ```

### Step 3: Final Configuration Check

- [ ] Review `.env.production` one more time
- [ ] Verify all placeholders replaced:
  ```bash
  grep "your-domain.com" .env.production
  grep "your_actual" .env.production
  # Both should return NOTHING
  ```

### Step 4: Deploy!

- [ ] Run deployment script:
  ```bash
  ./deploy.sh
  ```

- [ ] Wait for deployment to complete
- [ ] Check for errors in output

### Step 5: Verification

- [ ] Run health check:
  ```bash
  ./healthcheck.sh
  ```

- [ ] Verify containers running:
  ```bash
  docker ps | grep dataanalis
  # Should show 3 containers
  ```

- [ ] Check container logs:
  ```bash
  docker logs dataanalis-mysql | tail -20
  docker logs dataanalis-api | tail -20
  docker logs dataanalis-web | tail -20
  ```

- [ ] Test frontend access:
  ```bash
  curl http://localhost:3010
  # Should return HTML
  ```

- [ ] Test backend API:
  ```bash
  curl http://localhost:5010/api/health
  # Should return success response
  ```

- [ ] Access from browser:
  - [ ] Frontend: `http://vps-ip:3010` loads
  - [ ] No errors in browser console
  - [ ] Can navigate pages

## 🔐 Post-Deployment Security

### Firewall Configuration

- [ ] Setup UFW (if not already):
  ```bash
  sudo apt install ufw
  ```

- [ ] Configure firewall rules:
  ```bash
  sudo ufw allow 22/tcp      # SSH
  sudo ufw allow 3010/tcp    # Frontend
  sudo ufw allow 5010/tcp    # Backend
  sudo ufw enable
  ```

- [ ] Verify firewall status:
  ```bash
  sudo ufw status
  # Should show rules for ports 22, 3010, 5010
  ```

### Security Hardening

- [ ] File permissions verified:
  ```bash
  ls -la .env.production
  # Should be -rw------- (600)
  ```

- [ ] Database port NOT exposed to internet:
  ```bash
  sudo ufw status | grep 3309
  # Should show NOTHING (port not exposed)
  ```

- [ ] Strong passwords confirmed
- [ ] JWT secrets are random & long
- [ ] No default credentials in use

## 💾 Backup Configuration

### Manual Backup

- [ ] Test manual backup:
  ```bash
  ./backup.sh
  ```

- [ ] Verify backup created:
  ```bash
  ls -lh backups/
  # Should show .sql.gz file
  ```

### Automatic Backup (Optional)

- [ ] Setup cron job:
  ```bash
  ./setup-cron-backup.sh
  ```

- [ ] Verify cron installed:
  ```bash
  crontab -l | grep backup
  # Should show backup job
  ```

## 📊 Monitoring Setup

### Health Monitoring

- [ ] Bookmark health check command:
  ```bash
  ./healthcheck.sh
  ```

- [ ] Schedule regular checks (optional):
  ```bash
  # Add to cron for daily check at 8 AM
  0 8 * * * cd /opt/dataanalis && ./healthcheck.sh >> logs/health.log 2>&1
  ```

### Log Monitoring

- [ ] Check log files exist:
  ```bash
  ls -la backend/logs/
  # Should show combined.log and error.log
  ```

- [ ] Test log viewing:
  ```bash
  tail -f backend/logs/combined.log
  ```

## 🌐 Optional: HTTPS Setup

### Domain Configuration

- [ ] Domain DNS configured:
  - [ ] A record pointing to VPS IP
  - [ ] DNS propagated (check with `nslookup yourdomain.com`)

### Nginx Setup

- [ ] Nginx installed:
  ```bash
  sudo apt install nginx
  ```

- [ ] Copy nginx config:
  ```bash
  sudo cp nginx.conf /etc/nginx/sites-available/dataanalis
  sudo ln -s /etc/nginx/sites-available/dataanalis /etc/nginx/sites-enabled/
  ```

- [ ] Test config:
  ```bash
  sudo nginx -t
  ```

- [ ] Reload nginx:
  ```bash
  sudo systemctl reload nginx
  ```

### SSL Certificate

- [ ] Certbot installed:
  ```bash
  sudo apt install certbot python3-certbot-nginx
  ```

- [ ] Get certificate:
  ```bash
  sudo certbot --nginx -d yourdomain.com
  ```

- [ ] Test auto-renewal:
  ```bash
  sudo certbot renew --dry-run
  ```

- [ ] Update `.env.production` with HTTPS URLs
- [ ] Redeploy:
  ```bash
  ./deploy.sh
  ```

## 📝 Documentation

### User Documentation

- [ ] Document admin credentials
- [ ] Create user manual (if needed)
- [ ] Document backup procedures
- [ ] Document recovery procedures

### Technical Documentation

- [ ] Document any custom configurations
- [ ] Note any deviations from standard setup
- [ ] Record any issues encountered & solutions
- [ ] Document maintenance procedures

## 🎓 Team Training (if applicable)

- [ ] Train team on accessing application
- [ ] Train team on viewing logs
- [ ] Train team on basic troubleshooting
- [ ] Share credentials securely

## 📈 Performance Optimization (Optional)

### Database Optimization

- [ ] Review database indexes
- [ ] Setup slow query log
- [ ] Configure query cache

### Application Optimization

- [ ] Enable production optimizations
- [ ] Configure CDN (if needed)
- [ ] Setup caching (Redis/Memcached)

## 🔄 Update Procedures

### Planning Future Updates

- [ ] Document current version
- [ ] Setup update notification
- [ ] Plan maintenance windows
- [ ] Test update procedure in dev

## ✅ Final Verification

### Functional Testing

- [ ] User registration works
- [ ] User login works
- [ ] 2FA setup works (if enabled)
- [ ] Dashboard loads correctly
- [ ] Data synchronization works
- [ ] Reports generate correctly
- [ ] Export functions work (Excel, PDF)

### Performance Testing

- [ ] Page load times acceptable
- [ ] API response times < 1s
- [ ] Database queries optimized
- [ ] No memory leaks

### Security Testing

- [ ] Authentication required
- [ ] Authorization working
- [ ] No sensitive data exposed
- [ ] CORS configured correctly
- [ ] Rate limiting working

## 📋 Completion Checklist

### Core Deployment
- [ ] ✅ All files uploaded
- [ ] ✅ Configuration complete
- [ ] ✅ Deployment successful
- [ ] ✅ Health check passing
- [ ] ✅ Application accessible

### Security
- [ ] ✅ Firewall configured
- [ ] ✅ Strong passwords set
- [ ] ✅ File permissions secured
- [ ] ✅ Database not exposed

### Operations
- [ ] ✅ Backup working
- [ ] ✅ Logs accessible
- [ ] ✅ Monitoring setup
- [ ] ✅ Documentation complete

### Optional Enhancements
- [ ] 🔲 HTTPS configured
- [ ] 🔲 Domain setup
- [ ] 🔲 Auto-backup enabled
- [ ] 🔲 Monitoring alerts configured

## 🎉 Deployment Complete!

Once all items are checked:

```
╔═══════════════════════════════════════════╗
║   ✅ DEPLOYMENT SUCCESSFUL!               ║
║                                           ║
║   Your application is now live at:        ║
║   http://vps-ip:3010                      ║
║                                           ║
║   Next steps:                             ║
║   1. Monitor logs for first 24 hours     ║
║   2. Test all major features             ║
║   3. Setup regular backups               ║
║   4. Plan for HTTPS (recommended)        ║
╚═══════════════════════════════════════════╝
```

---

## 📞 Support

If any checks fail, refer to:
- `QUICKSTART.md` - Quick troubleshooting
- `README.DEPLOYMENT.md` - Detailed troubleshooting
- `./healthcheck.sh` - Diagnostic tool
- `docker logs [container-name]` - Container logs

## 📅 Maintenance Schedule

Recommended ongoing tasks:

### Daily
- [ ] Check application health
- [ ] Review error logs
- [ ] Monitor disk space

### Weekly
- [ ] Verify backups
- [ ] Review access logs
- [ ] Check for updates

### Monthly
- [ ] Update Docker images
- [ ] Review security
- [ ] Test restore procedure
- [ ] Performance review

---

**Version:** 1.0.0  
**Last Updated:** June 17, 2026  
**Status:** Production Ready ✅
