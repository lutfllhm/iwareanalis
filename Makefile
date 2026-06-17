# DataAnalis Makefile - Quick Commands

.PHONY: help dev prod logs stop restart clean backup

# Default target
help:
	@echo "================================================"
	@echo "  DataAnalis - Available Commands"
	@echo "================================================"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-logs     - Show development logs"
	@echo "  make dev-stop     - Stop development environment"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Deploy to production"
	@echo "  make prod-logs    - Show production logs"
	@echo "  make prod-stop    - Stop production environment"
	@echo "  make prod-restart - Restart production services"
	@echo ""
	@echo "Database:"
	@echo "  make backup       - Backup production database"
	@echo "  make restore      - Restore database from backup"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Remove all containers and volumes"
	@echo "  make ps           - Show running containers"
	@echo "  make prune        - Clean up Docker resources"
	@echo ""

# Development
dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started!"
	@echo "Frontend: http://localhost:3010"
	@echo "Backend: http://localhost:5010/api"

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-stop:
	docker-compose -f docker-compose.dev.yml down

# Production
prod:
	@echo "Deploying to production..."
	@./deploy.sh

prod-logs:
	docker-compose --env-file .env.production logs -f

prod-stop:
	docker-compose --env-file .env.production down

prod-restart:
	docker-compose --env-file .env.production restart

# Database
backup:
	@echo "Creating database backup..."
	@mkdir -p backups
	docker exec dataanalis-mysql mysqldump -u root -p$$(grep DB_ROOT_PASSWORD .env.production | cut -d '=' -f2) dataanalis > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created in backups/ directory"

restore:
	@echo "Available backups:"
	@ls -lh backups/
	@echo "To restore: docker exec -i dataanalis-mysql mysql -u root -pPASSWORD dataanalis < backups/BACKUP_FILE.sql"

# Maintenance
ps:
	@echo "DataAnalis Containers:"
	@docker ps | grep dataanalis

clean:
	@echo "Warning: This will remove all containers and volumes!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose --env-file .env.production down -v
	@echo "Cleanup complete!"

prune:
	@echo "Cleaning up unused Docker resources..."
	docker system prune -f
	@echo "Cleanup complete!"

stop:
	@echo "Stopping all DataAnalis containers..."
	docker stop $$(docker ps -q --filter "name=dataanalis") 2>/dev/null || true
	@echo "All containers stopped!"
