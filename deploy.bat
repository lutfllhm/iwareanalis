@echo off
REM ==========================================
REM DataAnalis Deployment Script untuk Windows
REM ==========================================

echo =====================================
echo   DataAnalis Deployment Script
echo =====================================
echo.

REM Check if .env.production exists
if not exist .env.production (
    echo [ERROR] .env.production file not found!
    echo Please copy .env.production and configure it first.
    pause
    exit /b 1
)

echo [OK] Environment file found
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Stop and remove old containers
echo Stopping old containers...
docker-compose -f docker-compose.yml --env-file .env.production down
echo.

REM Build and start containers
echo Building and starting containers...
docker-compose -f docker-compose.yml --env-file .env.production up -d --build
echo.

REM Wait for services
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul
echo.

REM Show container status
echo Container Status:
docker-compose -f docker-compose.yml --env-file .env.production ps
echo.

echo =====================================
echo Deployment Complete!
echo =====================================
echo.
echo Access URLs:
echo   Frontend: http://localhost:3010
echo   Backend API: http://localhost:5010/api
echo   MySQL: localhost:3309
echo.
echo Logs:
echo   docker logs dataanalis-web
echo   docker logs dataanalis-api
echo   docker logs dataanalis-mysql
echo.
echo Management Commands:
echo   Stop:    docker-compose -f docker-compose.yml --env-file .env.production down
echo   Restart: docker-compose -f docker-compose.yml --env-file .env.production restart
echo   Logs:    docker-compose -f docker-compose.yml --env-file .env.production logs -f
echo.

pause
