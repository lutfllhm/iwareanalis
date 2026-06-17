#!/bin/bash

# ==========================================
# Setup Cron Job untuk Backup Otomatis
# ==========================================

echo "====================================="
echo "  Setup Automatic Backup"
echo "====================================="
echo ""

# Get current directory
CURRENT_DIR=$(pwd)
BACKUP_SCRIPT="${CURRENT_DIR}/backup.sh"

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job
CRON_JOB="0 2 * * * cd ${CURRENT_DIR} && ./backup.sh >> ${CURRENT_DIR}/backups/backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup.sh"; then
    echo "Cron job already exists!"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep "backup.sh"
    echo ""
    read -p "Do you want to replace it? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    # Remove old cron job
    crontab -l | grep -v "backup.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✓ Cron job added successfully!"
echo ""
echo "Backup Schedule:"
echo "  Time: Daily at 2:00 AM"
echo "  Script: $BACKUP_SCRIPT"
echo "  Log: ${CURRENT_DIR}/backups/backup.log"
echo ""
echo "Current cron jobs:"
crontab -l
echo ""
echo "To view backup logs:"
echo "  tail -f ${CURRENT_DIR}/backups/backup.log"
echo ""
echo "To manually run backup:"
echo "  ./backup.sh"
echo ""
