# IP Geolocation Implementation for Location Analytics

## Setup & Configuration

### 1. Install Dependencies
```bash
npm install axios
npm install geoip-lite  # For offline geolocation (backup)
```

### 2. Environment Configuration
```env
# Add to .env
IPINFO_API_KEY=your_ipinfo_token
MAXMIND_LICENSE_KEY=your_maxmind_license
IPAPI_KEY=your_ipapi_key

# For rate limiting and caching
REDIS_URL=redis://localhost:6379
```

### 3. Geolocation Service
```javascript
// lib/geolocation.js
import axios from 'axios';
import geoip from 'geoip-lite';

class GeolocationService {
  constructor() {
    this.cache = new Map();
    this.providers = [
      {
        name: 'ipinfo',
        url: 'https://ipinfo.io/{ip}/json',
        token: process.env.IPINFO_API_KEY,
        rateLimit: 50000, // requests per month
      },
      {
        name: 'ipapi',
        url: 'http://ip-api.com/json/{ip}',
        rateLimit: 1000, // requests per hour for free
      },
      {
        name: 'ipgeolocation',
        url: 'https://api.ipgeolocation.io/ipgeo',
        key: process.env.IPAPI_KEY,
        rateLimit: 1000, // requests per day for free
      }
    ];
  }

  // Get visitor location from IP
  async getLocationFromIP(ip, provider = 'ipinfo') {
    // Check cache first
    const cacheKey = `location_${ip}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      let locationData;

      switch (provider) {
        case 'ipinfo':
          locationData = await this.getFromIPInfo(ip);
          break;
        case 'ipapi':
          locationData = await this.getFromIPAPI(ip);
          break;
        case 'offline':
          locationData = await this.getFromOffline(ip);
          break;
        default:
          locationData = await this.getFromIPInfo(ip);
      }

      // Cache the result
      this.cache.set(cacheKey, locationData);
      
      // Auto-expire cache after 24 hours
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, 24 * 60 * 60 * 1000);

      return locationData;
    } catch (error) {
      console.error(`Geolocation error for ${ip}:`, error);
      
      // Fallback to offline database
      return this.getFromOffline(ip);
    }
  }

  // IPInfo.io (Most accurate, has free tier)
  async getFromIPInfo(ip) {
    const url = `https://ipinfo.io/${ip}/json`;
    const headers = process.env.IPINFO_API_KEY ? 
      { Authorization: `Bearer ${process.env.IPINFO_API_KEY}` } : {};

    const response = await axios.get(url, { headers });
    const data = response.data;

    return {
      ip,
      country: data.country,
      countryName: this.getCountryName(data.country),
      region: data.region,
      city: data.city,
      latitude: data.loc ? parseFloat(data.loc.split(',')[0]) : null,
      longitude: data.loc ? parseFloat(data.loc.split(',')[1]) : null,
      timezone: data.timezone,
      org: data.org,
      provider: 'ipinfo'
    };
  }

  // IP-API.com (Free, good accuracy)
  async getFromIPAPI(ip) {
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,org,query`);
    const data = response.data;

    if (data.status === 'fail') {
      throw new Error(data.message);
    }

    return {
      ip: data.query,
      country: data.countryCode,
      countryName: data.country,
      region: data.regionName,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      org: data.org,
      provider: 'ipapi'
    };
  }

  // Offline fallback using geoip-lite
  async getFromOffline(ip) {
    const geo = geoip.lookup(ip);
    
    if (!geo) {
      return {
        ip,
        country: 'Unknown',
        countryName: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        latitude: null,
        longitude: null,
        provider: 'offline'
      };
    }

    return {
      ip,
      country: geo.country,
      countryName: this.getCountryName(geo.country),
      region: geo.region,
      city: geo.city,
      latitude: geo.ll[0],
      longitude: geo.ll[1],
      timezone: geo.timezone,
      provider: 'offline'
    };
  }

  // Helper to get full country name from code
  getCountryName(code) {
    const countries = {
      'US': 'United States',
      'GB': 'United Kingdom', 
      'CA': 'Canada',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'IN': 'India',
      'CN': 'China',
      'JP': 'Japan',
      'BR': 'Brazil',
      // Add more as needed
    };
    return countries[code] || code;
  }

  // Batch process multiple IPs
  async batchGetLocations(ips) {
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const batchPromises = batch.map(ip => 
        this.getLocationFromIP(ip).catch(error => ({ ip, error: error.message }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting delay
      if (i + batchSize < ips.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export const geolocationService = new GeolocationService();
```

### 4. Analytics Integration
```javascript
// lib/location-analytics.js
import { geolocationService } from './geolocation';

// Track visitor with location
export async function trackVisitorLocation(req) {
  const ip = getClientIP(req);
  
  try {
    const location = await geolocationService.getLocationFromIP(ip);
    
    // Store in your analytics database
    await storeVisitorLocation({
      ip,
      ...location,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer
    });
    
    return location;
  } catch (error) {
    console.error('Location tracking error:', error);
    return null;
  }
}

// Get client IP from request
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         '127.0.0.1';
}

// Store visitor location in database
async function storeVisitorLocation(locationData) {
  // This would integrate with your database
  // Example with Prisma:
  /*
  await prisma.visitorLocation.create({
    data: {
      ip: locationData.ip,
      country: locationData.country,
      countryName: locationData.countryName,
      region: locationData.region,
      city: locationData.city,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timestamp: locationData.timestamp,
      userAgent: locationData.userAgent,
      referer: locationData.referer
    }
  });
  */
}

// Get location analytics for charts
export async function getLocationAnalytics(startDate, endDate) {
  // This would query your database for location data
  // Example aggregated data structure:
  /*
  const locationData = await prisma.visitorLocation.groupBy({
    by: ['country', 'countryName', 'region', 'city'],
    where: {
      timestamp: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    },
    _count: {
      ip: true
    },
    orderBy: {
      _count: {
        ip: 'desc'
      }
    }
  });
  
  return locationData.map(item => ({
    country: item.countryName,
    region: item.region,
    city: item.city,
    visits: item._count.ip,
    percentage: calculatePercentage(item._count.ip, totalVisits)
  }));
  */
}
```

### 5. Middleware for Automatic Location Tracking
```javascript
// middleware/location-tracker.js
import { geolocationService } from '../lib/geolocation';

export async function locationTrackingMiddleware(req, res, next) {
  // Skip for API routes, static files, etc.
  if (req.url.startsWith('/api') || 
      req.url.startsWith('/_next') || 
      req.url.includes('.')) {
    return next();
  }

  try {
    const ip = getClientIP(req);
    
    // Get location in background (don't block the request)
    geolocationService.getLocationFromIP(ip)
      .then(location => {
        // Store location data
        req.visitorLocation = location;
        
        // Track in analytics
        trackPageViewWithLocation(req.url, location);
      })
      .catch(error => {
        console.error('Background location tracking failed:', error);
      });

    next();
  } catch (error) {
    console.error('Location middleware error:', error);
    next();
  }
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         '127.0.0.1';
}

async function trackPageViewWithLocation(url, location) {
  // Track in your analytics system
  // Could be Firebase, Google Analytics, custom database, etc.
  console.log('Page view tracked:', {
    url,
    country: location?.country,
    city: location?.city,
    timestamp: new Date()
  });
}
```

### 6. API Routes for Location Analytics
```javascript
// pages/api/analytics/locations.js
import { geolocationService } from '../../../lib/geolocation';
import { getLocationAnalytics } from '../../../lib/location-analytics';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, type, level } = req.query;

      switch (type) {
        case 'visitor-location':
          // Get real-time visitor location
          const ip = req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1';
          const location = await geolocationService.getLocationFromIP(ip);
          return res.status(200).json(location);

        case 'analytics':
          // Get aggregated location analytics
          const locationData = await getLocationAnalytics(startDate, endDate);
          
          // Filter by level (country, region, city)
          const filteredData = level === 'country' 
            ? aggregateByCountry(locationData)
            : level === 'region'
            ? aggregateByRegion(locationData)
            : locationData;
          
          return res.status(200).json(filteredData);

        case 'heatmap':
          // Get coordinates for heatmap visualization
          const heatmapData = await getHeatmapData(startDate, endDate);
          return res.status(200).json(heatmapData);

        default:
          return res.status(400).json({ message: 'Invalid type parameter' });
      }
    } catch (error) {
      console.error('Location API Error:', error);
      return res.status(500).json({ message: 'Failed to fetch location data' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

function aggregateByCountry(data) {
  const countryMap = new Map();
  
  data.forEach(item => {
    const country = item.country;
    if (countryMap.has(country)) {
      countryMap.get(country).visits += item.visits;
    } else {
      countryMap.set(country, {
        name: country,
        visits: item.visits,
        percentage: 0
      });
    }
  });

  const totalVisits = Array.from(countryMap.values())
    .reduce((sum, item) => sum + item.visits, 0);

  return Array.from(countryMap.values())
    .map(item => ({
      ...item,
      percentage: Math.round((item.visits / totalVisits) * 100)
    }))
    .sort((a, b) => b.visits - a.visits);
}
```

### 7. Frontend Integration
```javascript
// components/LocationChart.jsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LocationChart({ startDate, endDate }) {
  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLocationData() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/analytics/locations?type=analytics&level=country&startDate=${startDate}&endDate=${endDate}`
        );
        const data = await response.json();
        setLocationData(data);
      } catch (error) {
        console.error('Failed to fetch location data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLocationData();
  }, [startDate, endDate]);

  if (loading) {
    return <div>Loading location data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic by Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {locationData.map((location, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="font-medium">{location.name}</span>
              <div className="flex items-center gap-2">
                <span>{location.visits} visits</span>
                <span className="text-muted-foreground">({location.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```
