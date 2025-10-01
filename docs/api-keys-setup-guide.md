# Complete Guide: How to Get Analytics API Keys

## 📊 Google Analytics 4 API Keys

### Step 1: Create Google Cloud Project
1. **Go to**: [Google Cloud Console](https://console.cloud.google.com)
2. **Click**: "Select a project" → "New Project"
3. **Enter**: Project name (e.g., "My Store Analytics")
4. **Click**: "Create"

### Step 2: Enable Analytics API
1. **Navigate to**: APIs & Services → Library
2. **Search for**: "Google Analytics Reporting API"
3. **Click**: "Google Analytics Reporting API"
4. **Click**: "Enable"
5. **Also enable**: "Google Analytics Data API"

### Step 3: Create Service Account
1. **Go to**: APIs & Services → Credentials
2. **Click**: "Create Credentials" → "Service Account"
3. **Enter**: Service account name (e.g., "analytics-service")
4. **Click**: "Create and Continue"
5. **Role**: Select "Analytics Viewer"
6. **Click**: "Done"

### Step 4: Generate Private Key
1. **Click**: On your newly created service account
2. **Go to**: "Keys" tab
3. **Click**: "Add Key" → "Create New Key"
4. **Select**: JSON format
5. **Click**: "Create" (downloads JSON file)

### Step 5: Get GA4 Property ID
1. **Go to**: [Google Analytics](https://analytics.google.com)
2. **Select**: Your property
3. **Go to**: Admin → Property Settings
4. **Copy**: Property ID (looks like "123456789")

### Step 6: Get Measurement ID
1. **In GA4**: Admin → Data Streams
2. **Click**: Your web stream
3. **Copy**: Measurement ID (looks like "G-XXXXXXXXXX")

### Step 7: Grant Access to Service Account
1. **In GA4**: Admin → Account Access Management
2. **Click**: "+" → "Add users"
3. **Enter**: Service account email (from JSON file)
4. **Role**: "Viewer"
5. **Click**: "Add"

**Result**: You'll have:
```env
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GOOGLE_ANALYTICS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_ANALYTICS_CLIENT_EMAIL="analytics-service@project.iam.gserviceaccount.com"
```

---

## 💳 Stripe API Keys

### Step 1: Create Stripe Account
1. **Go to**: [Stripe.com](https://stripe.com)
2. **Click**: "Start now" or "Sign up"
3. **Complete**: Account registration
4. **Verify**: Email and business details

### Step 2: Access API Keys
1. **Login**: to Stripe Dashboard
2. **Go to**: Developers → API keys
3. **Toggle**: "Test data" (for development)

### Step 3: Copy Keys
1. **Publishable key**: Starts with `pk_test_`
2. **Secret key**: Click "Reveal test key" → starts with `sk_test_`
3. **Restricted key**: (Optional) Create for enhanced security

### Step 4: Setup Webhooks
1. **Go to**: Developers → Webhooks
2. **Click**: "Add endpoint"
3. **URL**: `https://yourdomain.com/api/webhooks/stripe-analytics`
4. **Events**: Select "payment_intent.succeeded"
5. **Click**: "Add endpoint"
6. **Copy**: Webhook signing secret (starts with `whsec_`)

**Result**: You'll have:
```env
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## 🔥 Firebase API Keys

### Step 1: Create Firebase Project
1. **Go to**: [Firebase Console](https://console.firebase.google.com)
2. **Click**: "Create a project"
3. **Enter**: Project name
4. **Choose**: Enable/disable Google Analytics
5. **Click**: "Create project"

### Step 2: Setup Web App
1. **Click**: Web icon (</>) "Add app"
2. **Enter**: App nickname
3. **Check**: "Also set up Firebase Hosting" (optional)
4. **Click**: "Register app"

### Step 3: Get Configuration
1. **Copy**: The config object from setup screen:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXX",
  authDomain: "project.firebaseapp.com",
  databaseURL: "https://project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123",
  measurementId: "G-XXXXXXXXX"
};
```

### Step 4: Enable Realtime Database
1. **Go to**: Build → Realtime Database
2. **Click**: "Create Database"
3. **Choose**: Start in test mode
4. **Select**: Database location
5. **Click**: "Done"

### Step 5: Enable Analytics (Optional)
1. **Go to**: Build → Analytics
2. **Click**: "Enable Google Analytics"
3. **Select**: GA4 property or create new

### Step 6: Setup Admin SDK (Server-side)
1. **Go to**: Project Settings → Service accounts
2. **Click**: "Generate new private key"
3. **Click**: "Generate key" (downloads JSON)

**Result**: You'll have:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXX
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@project.iam.gserviceaccount.com"
```

---

## 🌍 IP Geolocation API Keys

### 🎯 IPInfo (Recommended - Most Accurate)

#### Free Tier: 50,000 requests/month
1. **Go to**: [IPInfo.io](https://ipinfo.io)
2. **Click**: "Sign up free"
3. **Complete**: Registration
4. **Go to**: Dashboard → Tokens
5. **Copy**: Access token

**Result**:
```env
IPINFO_API_KEY=1234567890abcd
```

### 🎯 IP-API (Alternative - Free)

#### Free Tier: 1,000 requests/hour
1. **Go to**: [IP-API.com](https://ip-api.com)
2. **Click**: "API" → "JSON API"
3. **For free**: No registration needed
4. **For Pro**: Sign up for API key

**Result**: No key needed for free tier, or:
```env
IPAPI_KEY=your_pro_key
```

### 🎯 IPGeolocation (Backup Option)

#### Free Tier: 1,000 requests/day
1. **Go to**: [IPGeolocation.io](https://ipgeolocation.io)
2. **Click**: "Sign Up Free"
3. **Complete**: Registration
4. **Go to**: Dashboard
5. **Copy**: API key

**Result**:
```env
IPGEOLOCATION_API_KEY=abcd1234567890
```

### 🎯 MaxMind GeoIP2 (Enterprise)

#### Paid service with high accuracy
1. **Go to**: [MaxMind.com](https://www.maxmind.com)
2. **Click**: "Sign up"
3. **Choose**: GeoIP2 plan
4. **Complete**: Payment and setup
5. **Download**: Database files

**Result**:
```env
MAXMIND_LICENSE_KEY=your_license_key
```

---

## 🔧 Optional: Redis for Caching

### Local Redis (Development)
1. **Install**: Redis locally
   - **Windows**: Download from Redis website
   - **Mac**: `brew install redis`
   - **Linux**: `sudo apt install redis-server`
2. **Start**: Redis service
3. **Use**: `redis://localhost:6379`

### Cloud Redis (Production)

#### Redis Cloud (Free tier: 30MB)
1. **Go to**: [RedisLabs.com](https://redis.com)
2. **Click**: "Try Redis Cloud Free"
3. **Complete**: Registration
4. **Create**: New subscription (free tier)
5. **Create**: Database
6. **Copy**: Endpoint URL

#### Upstash Redis (Serverless)
1. **Go to**: [Upstash.com](https://upstash.com)
2. **Sign up**: with GitHub/Google
3. **Create**: Redis database
4. **Copy**: REST URL and token

**Result**:
```env
REDIS_URL=redis://username:password@host:port
# or for Upstash:
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

---

## 🎯 Quick Setup Summary

### Essential APIs (Free tiers available):
1. **Google Analytics 4** - Free (requires Google account)
2. **Stripe** - Free for testing (commission on live transactions)
3. **Firebase** - Free tier: 100K reads/day
4. **IPInfo** - Free tier: 50K requests/month

### Time Required:
- **Google Analytics**: ~15 minutes
- **Stripe**: ~10 minutes  
- **Firebase**: ~10 minutes
- **IP Geolocation**: ~5 minutes each

### Cost Breakdown (Monthly):
- **Development/Testing**: $0 (all free tiers)
- **Small Business**: ~$10-30/month
- **Enterprise**: ~$100-500/month

---

## 🚨 Security Best Practices

### Environment Variables
```env
# ✅ Good - Use environment variables
GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# ❌ Bad - Never hardcode in source code
const measurementId = "G-XXXXXXXXXX";
```

### Key Rotation
- **Rotate keys**: Every 90 days
- **Monitor usage**: Set up usage alerts
- **Restrict IPs**: Limit API access to your servers

### Rate Limiting
- **Implement**: Client-side rate limiting
- **Cache results**: Avoid repeated API calls
- **Use fallbacks**: Multiple providers for reliability

This setup will give you all the API keys needed for comprehensive real-time analytics!
