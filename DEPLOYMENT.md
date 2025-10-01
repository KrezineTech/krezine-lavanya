# Deployment Guide

## ✅ Issues Fixed

1. **HTML Template String Issue**: Fixed `<html>` tags in template strings that were being incorrectly detected as Next.js Html components
2. **Nixpacks Configuration**: Removed problematic `nixpacks.toml` file that had invalid TOML syntax
3. **Prisma Client Generation**: Added postinstall script to automatically generate Prisma client after npm install
4. **Docker Configuration**: Created proper Dockerfile with Prisma and OpenSSL support for Alpine Linux
5. **Standalone Build Start Command**: Fixed Railway deployment to use `node server.js` instead of `npm start` for standalone builds
6. **Html Component Detection**: Replaced template literal HTML construction with string concatenation to prevent Next.js from detecting Html imports in print functions

## 🚀 For Deployment Platforms (Railway, Vercel, etc.)

### Required Environment Variables:
```
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-app-domain.com
JWT_SECRET=your-jwt-secret-here
NODE_ENV=production
```

### Build Commands:
- **Install**: `npm install` (Prisma client will auto-generate via postinstall)
- **Build**: `npm run build`
- **Start**: `node server.js` (for standalone builds)

## 🐳 For Docker Deployment

Use the provided `Dockerfile`:

```bash
docker build -t lavaa-admin . \
  --build-arg DATABASE_URL="your-db-url" \
  --build-arg NEXTAUTH_SECRET="your-secret" \
  --build-arg JWT_SECRET="your-jwt-secret" \
  --build-arg NEXTAUTH_URL="https://your-domain.com"

docker run -p 3000:3000 lavaa-admin
```

## 📝 Deployment Platform Specific Notes

### Railway:
- Use the provided `railway.toml` configuration
- Set environment variables in Railway dashboard
- The deployment should work automatically

### Dokploy/Other Nixpacks Platforms:
- Let the platform auto-detect the Node.js app
- No custom nixpacks.toml needed
- Ensure environment variables are set

### Vercel:
- Works out of the box with these configurations
- Set environment variables in Vercel dashboard

## 🔧 Files Added/Modified:

- ✅ Fixed `src/components/orders/OrderDetailSheet.tsx`
- ✅ Fixed `src/components/orders/OrdersPageClient.tsx` 
- ✅ Updated `next.config.js` (added standalone output)
- ✅ Added `Dockerfile`
- ✅ Added `railway.toml`
- ✅ Added `build.sh`
- ✅ Updated `package.json` (added postinstall script)
- ✅ Updated `.dockerignore`
- ✅ Removed problematic `nixpacks.toml`

Your deployment should now work successfully! 🎉