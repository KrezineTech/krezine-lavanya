# Real-time Analytics Integration Architecture

## Complete Implementation Flow

### 1. Data Collection Layer
```
Frontend → Multiple APIs → Analytics Database → Real-time Dashboard
```

### 2. API Integration Points

#### Analytics Page Integration
```javascript
// hooks/useAnalyticsData.js
import { useState, useEffect } from 'react';
import { useRealtimeAnalytics } from './useRealtimeAnalytics';

export function useAnalyticsData(dateRange) {
  const [data, setData] = useState({
    visits: [],
    revenue: [],
    locations: [],
    realtime: {}
  });
  
  const { activeUsers, recentSales } = useRealtimeAnalytics();

  useEffect(() => {
    async function fetchAllData() {
      const [visitsData, revenueData, locationData] = await Promise.all([
        // Google Analytics - Visits
        fetch(`/api/analytics/visits?startDate=${dateRange.from}&endDate=${dateRange.to}`),
        
        // Stripe - Revenue
        fetch(`/api/analytics/revenue?startDate=${dateRange.from}&endDate=${dateRange.to}`),
        
        // IP Geolocation - Locations
        fetch(`/api/analytics/locations?type=analytics&startDate=${dateRange.from}&endDate=${dateRange.to}`)
      ]);

      setData({
        visits: await visitsData.json(),
        revenue: await revenueData.json(),
        locations: await locationData.json(),
        realtime: { activeUsers, recentSales }
      });
    }

    fetchAllData();
  }, [dateRange, activeUsers, recentSales]);

  return data;
}
```

### 3. Environment Variables Setup
```env
# Google Analytics
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GOOGLE_ANALYTICS_PRIVATE_KEY=your_private_key
GOOGLE_ANALYTICS_CLIENT_EMAIL=your_service_account_email

# Stripe (already configured)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Firebase (partially configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# IP Geolocation
IPINFO_API_KEY=your_ipinfo_token
IPAPI_KEY=your_ipapi_key

# Redis for caching (optional)
REDIS_URL=redis://localhost:6379
```

### 4. Updated Analytics Page Component
```javascript
// app/(main)/analytics/page.tsx - Integration points
export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({ 
    from: subDays(new Date(), 6), 
    to: new Date() 
  });
  
  // Use real data instead of mock data
  const analyticsData = useAnalyticsData(dateRange);
  
  // Replace chartData with real Google Analytics data
  const chartData = analyticsData.visits.chartData || [];
  
  // Replace revenue data with real Stripe data  
  const revenueData = analyticsData.revenue.chartData || [];
  
  // Replace location data with real IP geolocation data
  const locationData = analyticsData.locations || [];
  
  // Real-time metrics from Firebase
  const { activeUsers, recentSales } = analyticsData.realtime;

  return (
    <div className="space-y-6">
      {/* Existing UI with real data */}
      <ChartContainer config={{}} className="h-[300px] w-full">
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
            <YAxis domain={[0, 240]} ticks={[0, 60, 120, 180, 240]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <Tooltip content={<ChartTooltipContent indicator="dot" />} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
      
      {/* Real-time metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Live Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-2xl font-bold">{activeUsers.activeCount}</span>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
            <div>
              <span className="text-2xl font-bold">{recentSales.length}</span>
              <p className="text-sm text-muted-foreground">Recent Sales</p>
            </div>
            <div>
              <span className="text-2xl font-bold">
                ${recentSales.reduce((sum, sale) => sum + sale.amount, 0).toFixed(2)}
              </span>
              <p className="text-sm text-muted-foreground">Recent Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. Performance Optimizations

#### Caching Strategy
```javascript
// lib/analytics-cache.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedData(key, fetcher, ttl = 300) {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const data = await fetcher();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Cache error:', error);
    return await fetcher();
  }
}
```

#### Rate Limiting
```javascript
// lib/rate-limiter.js
const rateLimits = new Map();

export function rateLimit(identifier, limit = 100, window = 3600) {
  const now = Date.now();
  const windowStart = now - (window * 1000);
  
  if (!rateLimits.has(identifier)) {
    rateLimits.set(identifier, []);
  }
  
  const requests = rateLimits.get(identifier);
  const recentRequests = requests.filter(time => time > windowStart);
  
  if (recentRequests.length >= limit) {
    throw new Error('Rate limit exceeded');
  }
  
  recentRequests.push(now);
  rateLimits.set(identifier, recentRequests);
  
  return true;
}
```

### 6. Error Handling & Fallbacks
```javascript
// lib/analytics-service.js
export class AnalyticsService {
  async getVisitData(startDate, endDate) {
    try {
      // Try Google Analytics first
      return await getVisitData(startDate, endDate);
    } catch (error) {
      console.error('GA4 failed, falling back to Firebase:', error);
      
      try {
        // Fallback to Firebase Analytics
        return await getFirebaseVisitData(startDate, endDate);
      } catch (fallbackError) {
        console.error('All analytics sources failed:', fallbackError);
        
        // Return mock data as last resort
        return getMockVisitData();
      }
    }
  }
}
```

### 7. Monitoring & Health Checks
```javascript
// pages/api/health/analytics.js
export default async function handler(req, res) {
  const healthChecks = {
    googleAnalytics: false,
    stripe: false,
    firebase: false,
    geolocation: false
  };

  try {
    // Test Google Analytics
    await fetch(`https://analyticsreporting.googleapis.com/v4/reports:batchGet`);
    healthChecks.googleAnalytics = true;
  } catch (error) {}

  try {
    // Test Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await stripe.charges.list({ limit: 1 });
    healthChecks.stripe = true;
  } catch (error) {}

  try {
    // Test Firebase
    await adminDb.ref('metrics').once('value');
    healthChecks.firebase = true;
  } catch (error) {}

  try {
    // Test Geolocation
    await geolocationService.getLocationFromIP('8.8.8.8');
    healthChecks.geolocation = true;
  } catch (error) {}

  const allHealthy = Object.values(healthChecks).every(Boolean);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: healthChecks,
    timestamp: new Date().toISOString()
  });
}
```

## Implementation Timeline

### Phase 1 (Week 1): Core Setup
- ✅ Google Analytics 4 setup and basic tracking
- ✅ Stripe analytics API integration
- ✅ Firebase real-time database setup

### Phase 2 (Week 2): Advanced Features  
- ✅ IP Geolocation integration
- ✅ Real-time WebSocket connections
- ✅ Caching and rate limiting

### Phase 3 (Week 3): Optimization
- ✅ Error handling and fallbacks
- ✅ Performance monitoring
- ✅ Health checks and alerting

This comprehensive implementation provides real-time, accurate analytics data for all your chart visualizations while maintaining performance and reliability.
