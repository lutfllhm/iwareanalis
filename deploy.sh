#!/bin/bash

# ==========================================
# DataAnalis Deployment Script untuk VPS
# ==========================================

set -e

echo "====================================="
echo "  DataAnalis Deployment Script"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please copy .env.production and configure it first."
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.production | xargs)

echo -e "${GREEN}✓ Environment variables loaded${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Stop and remove old containers if they exist
echo -e "${YELLOW}Stopping old containers...${NC}"
docker-compose -f docker-compose.yml --env-file .env.production down

echo -e "${GREEN}✓ Old containers stopped${NC}"
echo ""

# Build and start containers
echo -e "${YELLOW}Building and starting containers...${NC}"
docker-compose -f docker-compose.yml --env-file .env.production up -d --build

echo ""
echo -e "${GREEN}✓ Containers started successfully!${NC}"
echo ""

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check container status
echo ""
echo -e "${YELLOW}Container Status:${NC}"
docker-compose -f docker-compose.yml --env-file .env.production ps

echo ""
echo "====================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "====================================="
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:3010"
echo "  Backend API: http://localhost:5010/api"
echo "  MySQL: localhost:3309"
echo ""
echo "Logs:"
echo "  docker logs dataanalis-web"
echo "  docker logs dataanalis-api"
echo "  docker logs dataanalis-mysql"
echo ""
echo "Management Commands:"
echo "  Stop:    docker-compose -f docker-compose.yml --env-file .env.production down"
echo "  Restart: docker-compose -f docker-compose.yml --env-file .env.production restart"
echo "  Logs:    docker-compose -f docker-compose.yml --env-file .env.production logs -f"
echo ""
