# Google Analytics 4 Implementation Guide

## Setup Steps

### 1. Install Dependencies
```bash
npm install gtag
npm install @google-analytics/data
```

### 2. Environment Configuration
```env
# Add to .env
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GOOGLE_ANALYTICS_PRIVATE_KEY=your_private_key
GOOGLE_ANALYTICS_CLIENT_EMAIL=your_service_account_email
```

### 3. Client-Side Tracking (Frontend)
```javascript
// utils/analytics.js
import { gtag } from 'gtag';

export const initGA = () => {
  gtag('config', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Track page views
export const trackPageView = (url, title) => {
  gtag('config', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID, {
    page_path: url,
    page_title: title,
  });
};

// Track custom events for product views
export const trackProductView = (productId, productName, price) => {
  gtag('event', 'view_item', {
    currency: 'USD',
    value: price,
    items: [{
      item_id: productId,
      item_name: productName,
      item_category: 'Art',
      price: price,
      quantity: 1
    }]
  });
};

// Track purchases
export const trackPurchase = (transactionId, value, items) => {
  gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: 'USD',
    items: items
  });
};
```

### 4. Server-Side Data Retrieval (Admin Analytics)
```javascript
// lib/google-analytics.js
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
});

const propertyId = process.env.GA4_PROPERTY_ID;

// Get visit data for charts
export async function getVisitData(startDate, endDate) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: startDate,
        endDate: endDate,
      },
    ],
    dimensions: [
      { name: 'date' },
      { name: 'hour' }, // For hourly breakdown
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'users' },
      { name: 'pageviews' },
      { name: 'screenPageViews' },
    ],
  });

  return response.rows.map(row => ({
    date: row.dimensionValues[0].value,
    hour: row.dimensionValues[1].value,
    sessions: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value),
    pageviews: parseInt(row.metricValues[2].value),
  }));
}

// Get real-time data
export async function getRealTimeData() {
  const [response] = await analyticsDataClient.runRealtimeReport({
    property: `properties/${propertyId}`,
    dimensions: [
      { name: 'country' },
      { name: 'city' },
    ],
    metrics: [
      { name: 'activeUsers' },
    ],
  });

  return {
    activeUsers: response.rows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value), 0),
    locations: response.rows.map(row => ({
      country: row.dimensionValues[0].value,
      city: row.dimensionValues[1].value,
      activeUsers: parseInt(row.metricValues[0].value),
    }))
  };
}

// Get comparison data (previous year)
export async function getComparisonData(startDate, endDate, previousYearStart, previousYearEnd) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate, endDate },
      { startDate: previousYearStart, endDate: previousYearEnd }
    ],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }],
  });

  return response.rows.map(row => ({
    date: row.dimensionValues[0].value,
    currentPeriod: parseInt(row.metricValues[0].value),
    previousPeriod: parseInt(row.metricValues[1].value),
  }));
}
```

### 5. API Route Implementation
```javascript
// pages/api/analytics/visits.js
import { getVisitData, getRealTimeData } from '../../../lib/google-analytics';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, realtime } = req.query;

    if (realtime === 'true') {
      const realtimeData = await getRealTimeData();
      return res.status(200).json(realtimeData);
    }

    const visitData = await getVisitData(startDate, endDate);
    
    // Transform data for Recharts
    const chartData = visitData.map(item => ({
      time: `${item.date.substring(4, 6)}/${item.date.substring(6, 8)}`,
      value: item.sessions,
      users: item.users,
      pageviews: item.pageviews
    }));

    res.status(200).json({ chartData });
  } catch (error) {
    console.error('GA4 API Error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics data' });
  }
}
```
