@echo off
REM ==========================================
REM Database Backup Script untuk Windows
REM ==========================================

echo =====================================
echo   DataAnalis Database Backup
echo =====================================
echo.

REM Configuration
set BACKUP_DIR=backups
set CONTAINER_NAME=dataanalis-mysql

REM Create backup directory
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%
echo [OK] Backup directory ready
echo.

REM Check if container is running
docker ps --filter "name=%CONTAINER_NAME%" --format "{{.Names}}" | findstr "%CONTAINER_NAME%" >nul
if errorlevel 1 (
    echo [ERROR] Container %CONTAINER_NAME% is not running
    pause
    exit /b 1
)
echo [OK] Container is running
echo.

REM Get current timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/: " %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%_%mytime%
set BACKUP_FILE=%BACKUP_DIR%\dataanalis_backup_%TIMESTAMP%.sql

REM Create backup
echo Creating backup...
docker exec %CONTAINER_NAME% mysqldump -u root -p --databases dataanalis --add-drop-database --add-drop-table --routines --triggers --events > %BACKUP_FILE%

if exist %BACKUP_FILE% (
    echo [OK] Backup created successfully
    echo File: %BACKUP_FILE%
    for %%A in (%BACKUP_FILE%) do echo Size: %%~zA bytes
) else (
    echo [ERROR] Backup failed
    pause
    exit /b 1
)

echo.
echo =====================================
echo Backup Completed Successfully!
echo =====================================
echo.
echo Available backups:
dir /b %BACKUP_DIR%\*.sql
echo.
echo To restore a backup:
echo   docker exec -i %CONTAINER_NAME% mysql -u root -p dataanalis ^< %BACKUP_FILE%
echo.

pause
