@echo off
REM ==========================================
REM Health Check Script untuk DataAnalis
REM ==========================================

echo =====================================
echo   DataAnalis Health Check
echo =====================================
echo.

set ALL_RUNNING=1

REM Check containers
echo Checking containers...
docker ps --filter "name=dataanalis-mysql" --format "{{.Names}}" | findstr "dataanalis-mysql" >nul
if errorlevel 1 (
    echo [X] dataanalis-mysql not found
    set ALL_RUNNING=0
) else (
    echo [OK] dataanalis-mysql is running
)

docker ps --filter "name=dataanalis-api" --format "{{.Names}}" | findstr "dataanalis-api" >nul
if errorlevel 1 (
    echo [X] dataanalis-api not found
    set ALL_RUNNING=0
) else (
    echo [OK] dataanalis-api is running
)

docker ps --filter "name=dataanalis-web" --format "{{.Names}}" | findstr "dataanalis-web" >nul
if errorlevel 1 (
    echo [X] dataanalis-web not found
    set ALL_RUNNING=0
) else (
    echo [OK] dataanalis-web is running
)

echo.

REM Check database
echo Checking database connection...
docker exec dataanalis-mysql mysqladmin ping -h localhost --silent >nul 2>&1
if errorlevel 1 (
    echo [X] Database is not responding
    set ALL_RUNNING=0
) else (
    echo [OK] Database is responding
)

echo.

REM Check backend API
echo Checking backend API...
curl -s -o nul -w "%%{http_code}" http://localhost:5010/api/health | findstr "200" >nul
if errorlevel 1 (
    echo [X] Backend API is not responding
    set ALL_RUNNING=0
) else (
    echo [OK] Backend API is responding
)

echo.

REM Check frontend
echo Checking frontend...
curl -s -o nul -w "%%{http_code}" http://localhost:3010 | findstr "200" >nul
if errorlevel 1 (
    echo [X] Frontend is not responding
    set ALL_RUNNING=0
) else (
    echo [OK] Frontend is responding
)

echo.

REM Resource usage
echo Resource usage:
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | findstr "dataanalis"

echo.
echo =====================================
if %ALL_RUNNING% == 1 (
    echo [OK] All services are healthy!
) else (
    echo [X] Some services are not healthy
    echo.
    echo Check logs with:
    echo   docker logs dataanalis-mysql
    echo   docker logs dataanalis-api
    echo   docker logs dataanalis-web
)
echo =====================================

pause
