# Docker Build Troubleshooting Guide

## ✅ Recent Fixes Applied

### 1. **Prisma Client Generation in Docker**
- **Issue**: Prisma schema files weren't available when `prisma generate` ran
- **Fix**: Copy Prisma files before generating client
- **Files Changed**: `Dockerfile` (lines 20-23)

### 2. **OpenSSL Missing in Alpine**
- **Issue**: Prisma requires OpenSSL but Alpine Linux doesn't include it by default
- **Fix**: Added `openssl` to both builder and runner stages
- **Files Changed**: `Dockerfile` (lines 7, 50)

### 3. **Prisma Runtime Files Not Copied**
- **Issue**: Generated Prisma client wasn't available in production image
- **Fix**: Explicitly copy `prisma/` and `node_modules/.prisma/` directories
- **Files Changed**: `Dockerfile` (lines 60-62)

### 4. **File Ordering for Layer Caching**
- **Issue**: Copying all files before Prisma generation invalidated cache
- **Fix**: Copy only necessary files for each step
- **Files Changed**: `Dockerfile` (reordered COPY commands)

## 🐳 Docker Build Command

For local testing:
```bash
docker build -t lavaa-admin . \
  --build-arg DATABASE_URL="postgresql://user:pass@host:5432/db" \
  --build-arg NEXTAUTH_SECRET="your-secret-here" \
  --build-arg JWT_SECRET="your-jwt-secret" \
  --build-arg NEXTAUTH_URL="http://localhost:3000"
```

For production:
```bash
docker build -t lavaa-admin . \
  --build-arg DATABASE_URL="$DATABASE_URL" \
  --build-arg NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  --build-arg JWT_SECRET="$JWT_SECRET" \
  --build-arg NEXTAUTH_URL="$NEXTAUTH_URL"
```

## 🔍 Common Docker Build Errors

### Error: "Can't reach database server"
**Cause**: DATABASE_URL not provided as build arg
**Solution**: Pass DATABASE_URL as `--build-arg` (see above)

### Error: "Prisma Client could not be generated"
**Cause**: Missing openssl or Prisma schema files
**Solution**: Already fixed - openssl is now installed, Prisma files copied first

### Error: "Cannot find module '@prisma/client'"
**Cause**: Prisma generated files not copied to production image
**Solution**: Already fixed - `.prisma` directory now copied to runner stage

### Error: "Module not found" for Next.js components
**Cause**: Using `npm start` instead of `node server.js` for standalone builds
**Solution**: Use `CMD ["node", "server.js"]` (already configured)

## 📋 Build Requirements Checklist

Before deploying, ensure:

- [ ] All environment variables are set:
  - `DATABASE_URL` (PostgreSQL connection string)
  - `NEXTAUTH_SECRET` (min 32 characters)
  - `JWT_SECRET` (min 32 characters)
  - `NEXTAUTH_URL` (your app's public URL)
  
- [ ] Database is accessible from Docker container
  - If using localhost DB, use `host.docker.internal` instead
  - Check firewall/network rules
  
- [ ] `.dockerignore` doesn't exclude necessary files:
  - `prisma/` directory must be included
  - `package.json` and `package-lock.json` must be included
  - `src/` directory must be included

## 🚀 Deployment Platform Specific

### Railway / Dokploy
- Use the provided `railway.toml` configuration
- Set environment variables in platform dashboard
- Use `node server.js` as start command (already configured)

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      args:
        DATABASE_URL: ${DATABASE_URL}
        NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
        JWT_SECRET: ${JWT_SECRET}
        NEXTAUTH_URL: ${NEXTAUTH_URL}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

## 🧪 Testing Your Build Locally

1. **Test npm build first**:
   ```bash
   npm run build
   ```
   If this fails, fix code issues before trying Docker.

2. **Test Docker build**:
   ```bash
   docker build -t lavaa-admin-test . \
     --build-arg DATABASE_URL="postgresql://dummy" \
     --build-arg NEXTAUTH_SECRET="test-secret-123456789012345678901234" \
     --build-arg JWT_SECRET="test-jwt-123456789012345678901234" \
     --build-arg NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Run the container**:
   ```bash
   docker run -p 3000:3000 \
     -e DATABASE_URL="your-real-db-url" \
     lavaa-admin-test
   ```

4. **Check logs**:
   ```bash
   docker logs <container-id>
   ```

## 🔧 Advanced Debugging

### View build logs in detail:
```bash
docker build --progress=plain --no-cache -t lavaa-admin .
```

### Inspect failed build:
```bash
# Find the last successful layer
docker images -a

# Run a shell in that layer
docker run -it <image-id> /bin/sh
```

### Check Prisma files in container:
```bash
docker run -it lavaa-admin /bin/sh
ls -la prisma/
ls -la node_modules/.prisma/
```

## 📞 Still Having Issues?

1. Check that your local `npm run build` passes ✅
2. Verify all environment variables are set correctly
3. Ensure database is accessible from Docker network
4. Check Docker daemon logs: `docker system info`
5. Try building without cache: `docker build --no-cache`

## 🎯 Success Indicators

You'll know the build succeeded when you see:
```
✓ Compiled successfully
✓ Generating static pages (52/52)
✓ Finalizing page optimization
Successfully built <image-id>
```

And the container runs without errors:
```bash
docker run -p 3000:3000 lavaa-admin
# Should show: Server listening on port 3000
```
