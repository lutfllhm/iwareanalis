#!/bin/bash

# ==========================================
# Database Backup Script untuk DataAnalis
# ==========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
CONTAINER_NAME="dataanalis-mysql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/dataanalis_backup_${TIMESTAMP}.sql"
KEEP_DAYS=7

echo "====================================="
echo "  DataAnalis Database Backup"
echo "====================================="
echo ""

# Load environment variables
if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
    echo -e "${GREEN}✓ Environment loaded${NC}"
else
    echo -e "${RED}✗ .env.production not found${NC}"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup directory ready${NC}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}✗ Container ${CONTAINER_NAME} not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Container is running${NC}"

# Create backup
echo ""
echo -e "${YELLOW}Creating backup...${NC}"
docker exec "$CONTAINER_NAME" mysqldump \
    -u root \
    -p"${DB_ROOT_PASSWORD}" \
    --databases "${DB_NAME}" \
    --add-drop-database \
    --add-drop-table \
    --routines \
    --triggers \
    --events \
    > "$BACKUP_FILE"

# Check if backup was created
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup created successfully${NC}"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $BACKUP_SIZE"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Compress backup
echo ""
echo -e "${YELLOW}Compressing backup...${NC}"
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
echo -e "${GREEN}✓ Backup compressed${NC}"
echo "  File: $COMPRESSED_FILE"
echo "  Size: $COMPRESSED_SIZE"

# Clean old backups
echo ""
echo -e "${YELLOW}Cleaning old backups (older than ${KEEP_DAYS} days)...${NC}"
find "$BACKUP_DIR" -name "dataanalis_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/dataanalis_backup_*.sql.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo "  Backups remaining: $REMAINING"

echo ""
echo "====================================="
echo -e "${GREEN}Backup Completed Successfully!${NC}"
echo "====================================="
echo ""
echo "To restore this backup:"
echo "  gunzip $COMPRESSED_FILE"
echo "  docker exec -i $CONTAINER_NAME mysql -u root -p${DB_ROOT_PASSWORD} < ${BACKUP_FILE}"
echo ""
