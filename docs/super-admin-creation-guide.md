# Super Admin Creation Guide

This guide provides multiple methods to create Super Admin users in your authentication system.

## 🏗️ Available Methods

### Method 1: Interactive Script (Recommended for First Setup)

**Best for:** Creating your first Super Admin or new Super Admin users

```bash
# Navigate to admin directory
cd admin

# Run the interactive script
node scripts/create-super-admin.js
```

**Features:**
- Interactive prompts for name, email, and password
- Hidden password input (shows asterisks)
- Password validation (8+ chars, uppercase, lowercase, number, special character)
- Automatically assigns comprehensive permissions
- Handles existing users (promotes to Super Admin)

### Method 2: Promote Existing Users

**Best for:** Promoting existing users to Super Admin role

```bash
# View all users
node scripts/promote-to-super-admin.js --list

# Promote specific user
node scripts/promote-to-super-admin.js user@example.com
```

**Features:**
- Lists all existing users with roles
- Promotes existing users to Super Admin
- Assigns all necessary permissions
- Shows before/after user details

### Method 3: API Endpoint

**Best for:** Programmatic creation or web-based setup

```bash
# Check if initial setup is needed
curl http://localhost:3000/api/create-super-admin

# Create Super Admin via API
curl -X POST http://localhost:3000/api/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@company.com",
    "password": "SecurePass123!",
    "adminSecret": "super-secret-admin-key-2024"
  }'
```

**Security Features:**
- Requires admin secret key for protection
- Only allows creation during initial setup OR by existing Super Admins
- Full validation and error handling

## 🔐 Super Admin Permissions

Super Admins automatically receive these permissions:

- **USER_MANAGEMENT** - Create, modify, delete users and roles
- **PRODUCT_MANAGEMENT** - Full product catalog control
- **ORDER_MANAGEMENT** - View and manage all orders
- **ANALYTICS_ACCESS** - Access to analytics and reporting
- **SYSTEM_SETTINGS** - Configure system-wide settings
- **CONTENT_MANAGEMENT** - Manage pages, blogs, media
- **CUSTOMER_SUPPORT** - Access customer service tools
- **FINANCIAL_ACCESS** - View financial data and reports
- **SECURITY_MANAGEMENT** - Security settings and audit logs
- **DEVELOPER_ACCESS** - Developer tools and API management

## 🎯 Role Hierarchy

```
SUPER_ADMIN (Full system access)
    ↓
ADMIN (Limited admin access)
    ↓
SUPPORT (Customer service access)
    ↓
USER (Basic user access)
    ↓
CUSTOMER (Customer-specific features)
```

## 🚀 Quick Start Examples

### First Time Setup
```bash
# 1. Run the interactive script
node scripts/create-super-admin.js

# 2. Enter details when prompted:
# Name: Your Full Name
# Email: admin@yourcompany.com
# Password: YourSecurePassword123!

# 3. Login at /login with these credentials
```

### Promote Existing User
```bash
# 1. List current users
node scripts/promote-to-super-admin.js --list

# 2. Promote specific user
node scripts/promote-to-super-admin.js existing-user@company.com
```

### Environment Setup for API Method
```bash
# Add to your .env.local file
SUPER_ADMIN_CREATION_SECRET=your-secure-secret-key-here
```

## 🔍 Verification

After creating a Super Admin, verify the setup:

```bash
# Check user was created properly
node scripts/promote-to-super-admin.js --list

# Or check via database
npx prisma studio
```

## 🛡️ Security Best Practices

1. **Change Default Secrets**: Update `SUPER_ADMIN_CREATION_SECRET` in production
2. **Strong Passwords**: Enforce the password requirements (8+ chars, mixed case, numbers, special chars)
3. **Limit Super Admins**: Only create necessary Super Admin accounts
4. **Regular Audits**: Periodically review Super Admin access
5. **Session Security**: Super Admins get secure JWT sessions with proper expiration

## 🐛 Troubleshooting

### Script Fails to Run
```bash
# Make sure you're in the admin directory
cd admin

# Install dependencies if missing
npm install

# Check if Prisma is properly configured
npx prisma generate
```

### User Already Exists Error
- The script automatically promotes existing users to Super Admin
- Check with: `node scripts/promote-to-super-admin.js --list`

### Database Connection Issues
- Verify `DATABASE_URL` in your `.env.local` file
- Ensure database is running and accessible
- Run: `npx prisma db push` to sync schema

### Password Validation Fails
Password must contain:
- At least 8 characters
- One uppercase letter (A-Z)
- One lowercase letter (a-z)  
- One number (0-9)
- One special character (@$!%*?&)

## 📞 Need Help?

If you encounter issues:

1. Check the console output for specific error messages
2. Verify your database connection and schema
3. Ensure all environment variables are properly set
4. Review the authentication documentation in `/docs/`

## 🎉 Next Steps

After creating your Super Admin:

1. Login at `/login` with your new credentials
2. Navigate to `/users` to manage other users
3. Configure system settings as needed
4. Set up additional admin users as required

Your Super Admin account now has full system access and can manage all aspects of the application!