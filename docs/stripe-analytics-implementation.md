# Stripe API Implementation for Revenue Analytics

## Setup & Configuration

### 1. Install Dependencies
```bash
npm install stripe
npm install @stripe/stripe-js
```

### 2. Environment Configuration (Already exists)
```env
# In .env (already configured)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 3. Server-Side Stripe Analytics
```javascript
// lib/stripe-analytics.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Get revenue data for charts
export async function getRevenueData(startDate, endDate) {
  try {
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(new Date(startDate).getTime() / 1000),
        lte: Math.floor(new Date(endDate).getTime() / 1000),
      },
      limit: 100,
      expand: ['data.payment_intent'],
    });

    // Group by date for chart data
    const revenueByDate = {};
    
    charges.data.forEach(charge => {
      if (charge.status === 'succeeded') {
        const date = new Date(charge.created * 1000);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = {
            date: dateKey,
            revenue: 0,
            orders: 0,
            averageOrderValue: 0
          };
        }
        
        revenueByDate[dateKey].revenue += charge.amount / 100; // Convert from cents
        revenueByDate[dateKey].orders += 1;
      }
    });

    // Calculate average order value
    Object.values(revenueByDate).forEach(day => {
      day.averageOrderValue = day.orders > 0 ? day.revenue / day.orders : 0;
    });

    return Object.values(revenueByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    console.error('Stripe API Error:', error);
    throw error;
  }
}

// Get real-time revenue (recent transactions)
export async function getRealtimeRevenue() {
  try {
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000), // Last 24 hours
      },
      limit: 50,
    });

    const last24Hours = charges.data
      .filter(charge => charge.status === 'succeeded')
      .reduce((total, charge) => total + (charge.amount / 100), 0);

    const recentTransactions = charges.data
      .filter(charge => charge.status === 'succeeded')
      .slice(0, 10)
      .map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency,
        created: charge.created,
        customer: charge.billing_details?.name || 'Anonymous'
      }));

    return {
      last24Hours,
      recentTransactions,
      totalToday: charges.data
        .filter(charge => {
          const today = new Date().toDateString();
          const chargeDate = new Date(charge.created * 1000).toDateString();
          return charge.status === 'succeeded' && chargeDate === today;
        })
        .reduce((total, charge) => total + (charge.amount / 100), 0)
    };
  } catch (error) {
    console.error('Stripe Realtime Error:', error);
    throw error;
  }
}

// Get revenue by geographic location
export async function getRevenueByLocation(startDate, endDate) {
  try {
    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: Math.floor(new Date(startDate).getTime() / 1000),
        lte: Math.floor(new Date(endDate).getTime() / 1000),
      },
      limit: 100,
    });

    const revenueByCountry = {};

    for (const intent of paymentIntents.data) {
      if (intent.status === 'succeeded' && intent.shipping?.address?.country) {
        const country = intent.shipping.address.country;
        
        if (!revenueByCountry[country]) {
          revenueByCountry[country] = {
            country,
            revenue: 0,
            orders: 0
          };
        }
        
        revenueByCountry[country].revenue += intent.amount / 100;
        revenueByCountry[country].orders += 1;
      }
    }

    return Object.values(revenueByCountry)
      .sort((a, b) => b.revenue - a.revenue);
  } catch (error) {
    console.error('Stripe Location Revenue Error:', error);
    throw error;
  }
}

// Get hourly revenue data for detailed charts
export async function getHourlyRevenueData(date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startOfDay.getTime() / 1000),
        lte: Math.floor(endOfDay.getTime() / 1000),
      },
      limit: 100,
    });

    // Group by hour
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      revenue: 0,
      orders: 0
    }));

    charges.data.forEach(charge => {
      if (charge.status === 'succeeded') {
        const hour = new Date(charge.created * 1000).getHours();
        hourlyData[hour].revenue += charge.amount / 100;
        hourlyData[hour].orders += 1;
      }
    });

    return hourlyData;
  } catch (error) {
    console.error('Stripe Hourly Data Error:', error);
    throw error;
  }
}
```

### 4. Webhook Handler for Real-time Updates
```javascript
// pages/api/webhooks/stripe-analytics.js
import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payments for real-time analytics
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Emit real-time update to connected clients
    // You can use WebSocket, Server-Sent Events, or polling
    console.log('Real-time revenue update:', {
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      timestamp: new Date().toISOString()
    });

    // TODO: Broadcast to connected analytics dashboards
    // broadcastRevenueUpdate(paymentIntent);
  }

  res.json({ received: true });
}
```

### 5. API Routes for Revenue Data
```javascript
// pages/api/analytics/revenue.js
import { getRevenueData, getRealtimeRevenue, getHourlyRevenueData } from '../../../lib/stripe-analytics';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, type, date } = req.query;

    switch (type) {
      case 'realtime':
        const realtimeData = await getRealtimeRevenue();
        return res.status(200).json(realtimeData);

      case 'hourly':
        const hourlyData = await getHourlyRevenueData(date);
        return res.status(200).json(hourlyData);

      default:
        const revenueData = await getRevenueData(startDate, endDate);
        
        // Transform for Recharts
        const chartData = revenueData.map(item => ({
          time: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: item.revenue,
          orders: item.orders,
          averageOrderValue: item.averageOrderValue
        }));

        return res.status(200).json({ chartData });
    }
  } catch (error) {
    console.error('Revenue API Error:', error);
    res.status(500).json({ message: 'Failed to fetch revenue data' });
  }
}
```
