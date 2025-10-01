#!/bin/bash

# 🚀 PRODUCTION DEPLOYMENT SCRIPT
# Enhanced version with better error handling and checks

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Functions for colored output
print_status() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

echo -e "${GREEN}🚀 Starting Production Deployment...${NC}"
echo "=================================================="

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Check required files
required_files=(".env" "docker-compose.prod.yml" "Dockerfile" "nginx/default.conf")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file $file not found"
        exit 1
    fi
done
print_success "All required files found"

# Check if .env file exists and has Redis configured
if [ ! -f .env ]; then
    print_error "⚠️  CRITICAL: .env file not found!"
    print_info "Please create .env file with your configuration."
    exit 1
fi

if ! grep -q "REDIS_URL" .env; then
    print_error "⚠️  CRITICAL: Redis configuration missing in .env!"
    print_info "Please add Redis configuration to your .env file."
    exit 1
fi
print_success "Environment file configured"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    print_success "Environment variables loaded"
fi

# Validate critical environment variables
critical_vars=("DATABASE_PASSWORD" "REDIS_PASSWORD" "NEXTAUTH_SECRET" "JWT_SECRET")
for var in "${critical_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Critical environment variable $var is not set"
        exit 1
    fi
done
print_success "Critical environment variables validated"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs nginx/ssl postgres-data redis-data uploads
print_success "Directories created"

# SSL Certificate handling
print_status "Checking SSL certificates..."
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    print_warning "SSL certificates not found. Generating self-signed certificates for testing..."
    print_warning "⚠️  For production, replace with valid SSL certificates!"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=${NEXTAUTH_URL#https://}" || {
        print_error "Failed to generate SSL certificates"
        exit 1
    }
    print_success "Self-signed SSL certificates generated"
else
    print_success "SSL certificates found"
fi

# Docker operations
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

print_status "Removing old images to ensure fresh build..."
docker-compose -f docker-compose.prod.yml build --no-cache

print_status "Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up (healthy)"; then
        break
    fi
    echo "Waiting for services... ($((attempt + 1))/$max_attempts)"
    sleep 10
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Services failed to become healthy within expected time"
    print_info "Checking service logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=20
    exit 1
fi

# Database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T admin_app_prod npx prisma db push || {
    print_error "Database migration failed"
    docker-compose -f docker-compose.prod.yml logs admin_app_prod
    exit 1
}
print_success "Database migrations completed"

# Generate Prisma client
print_status "Generating Prisma client..."
docker-compose -f docker-compose.prod.yml exec -T admin_app_prod npx prisma generate || {
    print_warning "Prisma client generation failed, but continuing..."
}

# Health checks
print_status "Performing comprehensive health checks..."
sleep 10

services=("admin_app_prod" "admin_postgres_prod" "admin_redis_prod" "admin_nginx_prod")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "$service.*Up"; then
        print_success "$service is running"
    else
        print_error "$service is not running properly"
        docker-compose -f docker-compose.prod.yml logs "$service"
        exit 1
    fi
done

# Application health check
print_status "Testing application health endpoint..."
sleep 5

if curl -k -f "https://localhost/api/health" > /dev/null 2>&1; then
    print_success "Application health check passed"
elif curl -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
    print_success "Application is responding (direct port access)"
    print_warning "HTTPS endpoint not accessible - check SSL configuration"
else
    print_warning "Application health check failed - checking logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=10 admin_app_prod
fi

# Final status
print_status "Deployment Summary:"
echo "=================================================="
docker-compose -f docker-compose.prod.yml ps

echo ""
print_success "🎉 Production deployment completed!"
echo ""
print_info "Access your application:"
echo -e "  ${GREEN}HTTPS:${NC} https://localhost (recommended)"
echo -e "  ${GREEN}HTTP:${NC}  http://localhost (redirects to HTTPS)"
echo -e "  ${GREEN}Direct:${NC} http://localhost:3000 (bypasses nginx)"
echo ""
print_info "Useful management commands:"
echo -e "  ${YELLOW}View all logs:${NC}     docker-compose -f docker-compose.prod.yml logs -f"
echo -e "  ${YELLOW}View app logs:${NC}     docker-compose -f docker-compose.prod.yml logs -f admin_app_prod"
echo -e "  ${YELLOW}Stop services:${NC}     docker-compose -f docker-compose.prod.yml down"
echo -e "  ${YELLOW}Restart app:${NC}       docker-compose -f docker-compose.prod.yml restart admin_app_prod"
echo -e "  ${YELLOW}Database backup:${NC}   docker-compose -f docker-compose.prod.yml exec admin_postgres_prod pg_dump -U $DATABASE_USER $DATABASE_NAME > backup.sql"
echo ""
print_warning "Important security reminders:"
echo "1. Replace self-signed SSL certificates with valid ones"
echo "2. Review and update firewall rules"
echo "3. Set up automated backups"
echo "4. Configure monitoring and alerting"
echo "5. Review logs regularly"
echo "=================================================="