@echo off
REM ==========================================
REM Quick Commands untuk DataAnalis
REM ==========================================

:menu
cls
echo =====================================
echo   DataAnalis - Quick Commands
echo =====================================
echo.
echo 1. Deploy Production
echo 2. Start Development
echo 3. View Logs (Production)
echo 4. View Logs (Development)
echo 5. Stop Production
echo 6. Stop Development
echo 7. Restart Production
echo 8. Health Check
echo 9. Backup Database
echo 10. Show Running Containers
echo 0. Exit
echo.
set /p choice="Select option (0-10): "

if "%choice%"=="1" goto deploy_prod
if "%choice%"=="2" goto start_dev
if "%choice%"=="3" goto logs_prod
if "%choice%"=="4" goto logs_dev
if "%choice%"=="5" goto stop_prod
if "%choice%"=="6" goto stop_dev
if "%choice%"=="7" goto restart_prod
if "%choice%"=="8" goto health
if "%choice%"=="9" goto backup
if "%choice%"=="10" goto show_containers
if "%choice%"=="0" goto end
goto menu

:deploy_prod
echo.
echo Deploying production...
call deploy.bat
pause
goto menu

:start_dev
echo.
echo Starting development environment...
docker-compose -f docker-compose.dev.yml up -d
echo.
echo Development started!
echo Frontend: http://localhost:3010
echo Backend: http://localhost:5010/api
pause
goto menu

:logs_prod
echo.
echo Production logs (Ctrl+C to exit):
docker-compose --env-file .env.production logs -f
goto menu

:logs_dev
echo.
echo Development logs (Ctrl+C to exit):
docker-compose -f docker-compose.dev.yml logs -f
goto menu

:stop_prod
echo.
echo Stopping production...
docker-compose --env-file .env.production down
echo Production stopped!
pause
goto menu

:stop_dev
echo.
echo Stopping development...
docker-compose -f docker-compose.dev.yml down
echo Development stopped!
pause
goto menu

:restart_prod
echo.
echo Restarting production...
docker-compose --env-file .env.production restart
echo Production restarted!
pause
goto menu

:health
echo.
call healthcheck.bat
goto menu

:backup
echo.
echo Creating database backup...
if not exist backups mkdir backups
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set filename=backups\backup_%mydate%_%mytime%.sql
echo Backup file: %filename%
docker exec dataanalis-mysql mysqldump -u root -p dataanalis > %filename%
echo Backup created!
pause
goto menu

:show_containers
echo.
echo DataAnalis Containers:
docker ps | findstr "dataanalis"
pause
goto menu

:end
echo.
echo Goodbye!
exit /b 0
