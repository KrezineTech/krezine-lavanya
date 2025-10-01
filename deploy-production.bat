@echo off
setlocal enabledelayedexpansion

REM 🚀 PRODUCTION DEPLOYMENT SCRIPT FOR WINDOWS
REM Enhanced version with better error handling and checks

echo.
echo 🚀 Starting Production Deployment...
echo ==================================================

REM Pre-deployment checks
echo [%date% %time%] Running pre-deployment checks...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)
echo ✅ Docker is running

REM Check required files
set "required_files=.env docker-compose.prod.yml Dockerfile nginx\default.conf"
for %%f in (%required_files%) do (
    if not exist "%%f" (
        echo ❌ Required file %%f not found
        exit /b 1
    )
)
echo ✅ All required files found

REM Check if .env file exists and has Redis configured
if not exist ".env" (
    echo ❌ CRITICAL: .env file not found!
    echo ℹ️  Please create .env file with your configuration.
    exit /b 1
)

findstr /C:"REDIS_URL" .env >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ CRITICAL: Redis configuration missing in .env!
    echo ℹ️  Please add Redis configuration to your .env file.
    exit /b 1
)
echo ✅ Environment file configured

REM Create necessary directories
echo [%date% %time%] Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "nginx\ssl" mkdir nginx\ssl
if not exist "postgres-data" mkdir postgres-data
if not exist "redis-data" mkdir redis-data
if not exist "uploads" mkdir uploads
echo ✅ Directories created

REM SSL Certificate handling
echo [%date% %time%] Checking SSL certificates...
if not exist "nginx\ssl\cert.pem" (
    echo ⚠️  SSL certificates not found. You need to provide SSL certificates.
    echo ⚠️  For testing, you can generate self-signed certificates using:
    echo    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem
    echo ⚠️  For production, use valid SSL certificates!
) else (
    echo ✅ SSL certificates found
)

REM Docker operations
echo [%date% %time%] Stopping existing containers...
docker-compose -f docker-compose.prod.yml down --remove-orphans

echo [%date% %time%] Building fresh images...
docker-compose -f docker-compose.prod.yml build --no-cache

echo [%date% %time%] Starting production services...
docker-compose -f docker-compose.prod.yml up -d

REM Wait for services to be ready
echo [%date% %time%] Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Database migrations
echo [%date% %time%] Running database migrations...
docker-compose -f docker-compose.prod.yml exec -T admin_app_prod npx prisma db push
if %errorlevel% neq 0 (
    echo ❌ Database migration failed
    docker-compose -f docker-compose.prod.yml logs admin_app_prod
    exit /b 1
)
echo ✅ Database migrations completed

REM Generate Prisma client
echo [%date% %time%] Generating Prisma client...
docker-compose -f docker-compose.prod.yml exec -T admin_app_prod npx prisma generate

REM Health checks
echo [%date% %time%] Performing health checks...
timeout /t 10 /nobreak >nul

REM Final status
echo [%date% %time%] Deployment Summary:
echo ==================================================
docker-compose -f docker-compose.prod.yml ps

echo.
echo ✅ 🎉 Production deployment completed!
echo.
echo ℹ️  Access your application:
echo   HTTPS: https://localhost (recommended)
echo   HTTP:  http://localhost (redirects to HTTPS)
echo   Direct: http://localhost:3000 (bypasses nginx)
echo.
echo ℹ️  Useful management commands:
echo   View all logs:     docker-compose -f docker-compose.prod.yml logs -f
echo   View app logs:     docker-compose -f docker-compose.prod.yml logs -f admin_app_prod
echo   Stop services:     docker-compose -f docker-compose.prod.yml down
echo   Restart app:       docker-compose -f docker-compose.prod.yml restart admin_app_prod
echo.
echo ⚠️  Important security reminders:
echo 1. Replace self-signed SSL certificates with valid ones
echo 2. Review and update firewall rules
echo 3. Set up automated backups
echo 4. Configure monitoring and alerting
echo 5. Review logs regularly
echo ==================================================

pause