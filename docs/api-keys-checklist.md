# Visual Guide: API Keys Setup Checklist

## 📋 Step-by-Step Checklist

### 🎯 Phase 1: Google Analytics 4 (15 minutes)
```
□ Create Google Cloud Project
□ Enable Analytics Reporting API
□ Enable Analytics Data API  
□ Create Service Account
□ Download JSON key file
□ Get GA4 Property ID
□ Get Measurement ID
□ Grant service account access
□ Test API connection
```

### 💳 Phase 2: Stripe (10 minutes)
```
□ Create Stripe account
□ Access Dashboard
□ Copy test publishable key
□ Copy test secret key
□ Setup webhook endpoint
□ Copy webhook secret
□ Test API connection
```

### 🔥 Phase 3: Firebase (10 minutes)
```
□ Create Firebase project
□ Add web app
□ Copy config object
□ Enable Realtime Database
□ Generate admin SDK key
□ Setup security rules
□ Test connection
```

### 🌍 Phase 4: IP Geolocation (5 minutes each)
```
□ Sign up for IPInfo.io
□ Copy access token
□ (Optional) Sign up for backup services
□ Test API endpoints
```

## 🔑 Final Environment File

Create `.env` file with all keys:

```env
# Google Analytics 4
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GOOGLE_ANALYTICS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_ANALYTICS_CLIENT_EMAIL="service@project.iam.gserviceaccount.com"

# Stripe (already configured)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Firebase
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

# IP Geolocation
IPINFO_API_KEY=1234567890abcd
IPAPI_KEY=your_pro_key (optional)

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

## 🚀 Quick Start Commands

After getting all API keys:

```bash
# 1. Install dependencies
npm install @google-analytics/data stripe geoip-lite axios ioredis

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# 3. Test API connections
npm run test:apis

# 4. Start development server
npm run dev
```

## 💰 Cost Calculator

### Free Tier Limits:
- **Google Analytics**: Unlimited (free)
- **Stripe**: Free (2.9% + 30¢ per transaction)
- **Firebase**: 100K reads/day, 20K writes/day
- **IPInfo**: 50,000 requests/month

### Estimated Monthly Costs:
```
Small Business (1K visitors/day):
- Analytics: $0
- Payment processing: ~$30-100
- Firebase: $0 (within free tier)
- IP Geolocation: $0 (within free tier)
Total: ~$30-100/month

Medium Business (10K visitors/day):
- Analytics: $0
- Payment processing: ~$300-1000
- Firebase: ~$5-25
- IP Geolocation: ~$10-50
Total: ~$315-1075/month
```

## 🔧 Testing Your Setup

### Test Scripts to Verify APIs:

```javascript
// test-apis.js
const { testGoogleAnalytics } = require('./lib/test-ga');
const { testStripe } = require('./lib/test-stripe');
const { testFirebase } = require('./lib/test-firebase');
const { testGeolocation } = require('./lib/test-geo');

async function testAllAPIs() {
  console.log('🧪 Testing API connections...\n');
  
  try {
    await testGoogleAnalytics();
    console.log('✅ Google Analytics: Connected');
  } catch (error) {
    console.log('❌ Google Analytics: Failed');
  }
  
  try {
    await testStripe();
    console.log('✅ Stripe: Connected');
  } catch (error) {
    console.log('❌ Stripe: Failed');
  }
  
  try {
    await testFirebase();
    console.log('✅ Firebase: Connected');
  } catch (error) {
    console.log('❌ Firebase: Failed');
  }
  
  try {
    await testGeolocation();
    console.log('✅ IP Geolocation: Connected');
  } catch (error) {
    console.log('❌ IP Geolocation: Failed');
  }
}

testAllAPIs();
```

## 🎯 Success Indicators

You'll know your setup is working when:

1. **Analytics Page**: Shows real visitor data instead of mock data
2. **Revenue Charts**: Display actual Stripe transaction data
3. **Location Maps**: Show real visitor locations
4. **Real-time Metrics**: Update live as users interact with your site

Your analytics dashboard will transform from static mock data to a living, breathing business intelligence platform!
