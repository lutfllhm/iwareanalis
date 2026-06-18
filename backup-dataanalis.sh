#!/bin/bash
BACKUP_DIR="/var/backups/dataanalis"
DATE=$(date +%Y-%m-%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Load environment variables dari file .env
export $(grep -v '^#' /opt/analis/.env | xargs)

# Jalankan mysqldump
docker exec dataanalis-mysql mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Kompres file backup menjadi gzip
gzip $BACKUP_DIR/backup_$DATE.sql

# Hapus backup yang usianya lebih dari 14 hari agar disk tidak penuh
find $BACKUP_DIR -type f -name "*.gz" -mtime +14 -delete

echo "Backup completed: backup_$DATE.sql.gz"
