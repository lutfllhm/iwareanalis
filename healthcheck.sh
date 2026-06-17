#!/bin/bash

# ==========================================
# Health Check Script untuk DataAnalis
# ==========================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "====================================="
echo "  DataAnalis Health Check"
echo "====================================="
echo ""

# Check if containers are running
echo -e "${YELLOW}Checking containers...${NC}"
containers=("dataanalis-mysql" "dataanalis-api" "dataanalis-web")
all_running=true

for container in "${containers[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        status=$(docker inspect --format='{{.State.Status}}' $container)
        if [ "$status" = "running" ]; then
            echo -e "${GREEN}✓${NC} $container is running"
        else
            echo -e "${RED}✗${NC} $container is $status"
            all_running=false
        fi
    else
        echo -e "${RED}✗${NC} $container not found"
        all_running=false
    fi
done

echo ""

# Check database connection
echo -e "${YELLOW}Checking database connection...${NC}"
if docker exec dataanalis-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Database is responding"
else
    echo -e "${RED}✗${NC} Database is not responding"
    all_running=false
fi

echo ""

# Check backend API
echo -e "${YELLOW}Checking backend API...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5010/api/health | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Backend API is responding"
else
    echo -e "${RED}✗${NC} Backend API is not responding"
    all_running=false
fi

echo ""

# Check frontend
echo -e "${YELLOW}Checking frontend...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Frontend is responding"
else
    echo -e "${RED}✗${NC} Frontend is not responding"
    all_running=false
fi

echo ""

# Resource usage
echo -e "${YELLOW}Resource usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep dataanalis

echo ""

# Summary
echo "====================================="
if [ "$all_running" = true ]; then
    echo -e "${GREEN}✓ All services are healthy!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some services are not healthy${NC}"
    echo ""
    echo "Check logs with:"
    echo "  docker logs dataanalis-mysql"
    echo "  docker logs dataanalis-api"
    echo "  docker logs dataanalis-web"
    exit 1
fi
