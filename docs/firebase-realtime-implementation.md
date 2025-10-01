# Firebase Real-time Analytics Implementation

## Setup & Configuration

### 1. Dependencies (Already installed)
```json
// package.json already has:
"firebase": "^11.9.1" (admin)
"firebase": "^10.12.3" (frontend)
```

### 2. Firebase Configuration
```javascript
// lib/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
```

### 3. Real-time Metrics Tracking
```javascript
// lib/firebase-analytics.js
import { logEvent } from 'firebase/analytics';
import { ref, set, push, onValue, off, serverTimestamp } from 'firebase/database';
import { analytics, realtimeDb } from './firebase-config';

// Track custom events
export const trackEvent = (eventName, parameters) => {
  if (typeof window !== 'undefined' && analytics) {
    logEvent(analytics, eventName, parameters);
  }
};

// Real-time visitor tracking
export const trackActiveUser = (userId, pageData) => {
  if (typeof window !== 'undefined') {
    const userRef = ref(realtimeDb, `activeUsers/${userId}`);
    
    set(userRef, {
      ...pageData,
      timestamp: serverTimestamp(),
      lastSeen: Date.now()
    });

    // Remove user when they leave
    window.addEventListener('beforeunload', () => {
      set(userRef, null);
    });

    // Update heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      set(userRef, {
        ...pageData,
        timestamp: serverTimestamp(),
        lastSeen: Date.now()
      });
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      set(userRef, null);
    };
  }
};

// Track product interactions in real-time
export const trackProductInteraction = (productId, action, value = null) => {
  const interactionRef = ref(realtimeDb, 'productInteractions');
  
  push(interactionRef, {
    productId,
    action, // 'view', 'add_to_cart', 'purchase', 'favorite'
    value,
    timestamp: serverTimestamp(),
    userId: getCurrentUserId() // Implement this function
  });

  // Also track in Firebase Analytics
  trackEvent('product_interaction', {
    product_id: productId,
    action,
    value
  });
};

// Real-time sales tracking
export const trackSale = (saleData) => {
  const salesRef = ref(realtimeDb, 'realtimeSales');
  
  push(salesRef, {
    ...saleData,
    timestamp: serverTimestamp()
  });

  // Track in Firebase Analytics
  trackEvent('purchase', {
    transaction_id: saleData.transactionId,
    value: saleData.amount,
    currency: saleData.currency,
    items: saleData.items
  });
};

// Listen to real-time active users
export const subscribeToActiveUsers = (callback) => {
  const activeUsersRef = ref(realtimeDb, 'activeUsers');
  
  const unsubscribe = onValue(activeUsersRef, (snapshot) => {
    const users = snapshot.val() || {};
    const activeCount = Object.keys(users).length;
    const usersList = Object.entries(users).map(([id, data]) => ({
      id,
      ...data
    }));
    
    callback({ activeCount, usersList });
  });

  return unsubscribe;
};

// Listen to real-time sales
export const subscribeToRealtimeSales = (callback) => {
  const salesRef = ref(realtimeDb, 'realtimeSales');
  
  // Get recent sales (last hour)
  const recentSalesQuery = ref(realtimeDb, 'realtimeSales');
  
  const unsubscribe = onValue(recentSalesQuery, (snapshot) => {
    const sales = [];
    snapshot.forEach((childSnapshot) => {
      const sale = childSnapshot.val();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      if (sale.timestamp && sale.timestamp > oneHourAgo) {
        sales.push({ id: childSnapshot.key, ...sale });
      }
    });
    
    callback(sales.reverse()); // Most recent first
  });

  return unsubscribe;
};

// Get real-time metrics for charts
export const getRealtimeMetrics = () => {
  return new Promise((resolve) => {
    const metricsRef = ref(realtimeDb, 'metrics');
    
    onValue(metricsRef, (snapshot) => {
      const metrics = snapshot.val() || {
        activeUsers: 0,
        todayVisits: 0,
        todayRevenue: 0,
        recentOrders: []
      };
      
      resolve(metrics);
    }, { onlyOnce: true });
  });
};
```

### 4. Server-side Real-time Analytics
```javascript
// lib/firebase-admin.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export const adminDb = admin.database();
export const adminFirestore = admin.firestore();

// Aggregate real-time metrics
export const updateRealtimeMetrics = async () => {
  try {
    const activeUsersSnapshot = await adminDb.ref('activeUsers').once('value');
    const salesSnapshot = await adminDb.ref('realtimeSales').once('value');
    
    const activeUsers = activeUsersSnapshot.val() || {};
    const sales = salesSnapshot.val() || {};
    
    // Calculate today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    let todayRevenue = 0;
    let todayOrders = 0;
    
    Object.values(sales).forEach(sale => {
      if (sale.timestamp >= todayTimestamp) {
        todayRevenue += sale.amount || 0;
        todayOrders += 1;
      }
    });
    
    const metrics = {
      activeUsers: Object.keys(activeUsers).length,
      todayRevenue,
      todayOrders,
      lastUpdated: admin.database.ServerValue.TIMESTAMP
    };
    
    await adminDb.ref('metrics').set(metrics);
    
    return metrics;
  } catch (error) {
    console.error('Error updating realtime metrics:', error);
    throw error;
  }
};
```

### 5. Real-time API Endpoints
```javascript
// pages/api/analytics/realtime.js
import { updateRealtimeMetrics, adminDb } from '../../../lib/firebase-admin';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { type } = req.query;
      
      switch (type) {
        case 'metrics':
          const metrics = await updateRealtimeMetrics();
          return res.status(200).json(metrics);
          
        case 'active-users':
          const activeUsersSnapshot = await adminDb.ref('activeUsers').once('value');
          const activeUsers = activeUsersSnapshot.val() || {};
          
          const usersWithLocation = Object.entries(activeUsers).map(([id, user]) => ({
            id,
            country: user.country || 'Unknown',
            city: user.city || 'Unknown',
            page: user.page || '/',
            timestamp: user.timestamp
          }));
          
          return res.status(200).json({
            count: usersWithLocation.length,
            users: usersWithLocation
          });
          
        case 'recent-sales':
          const salesSnapshot = await adminDb.ref('realtimeSales')
            .orderByChild('timestamp')
            .limitToLast(10)
            .once('value');
            
          const recentSales = [];
          salesSnapshot.forEach(child => {
            recentSales.unshift({ id: child.key, ...child.val() });
          });
          
          return res.status(200).json(recentSales);
          
        default:
          return res.status(400).json({ message: 'Invalid type parameter' });
      }
    } catch (error) {
      console.error('Realtime API Error:', error);
      return res.status(500).json({ message: 'Failed to fetch realtime data' });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const { event, data } = req.body;
      
      switch (event) {
        case 'track-sale':
          await adminDb.ref('realtimeSales').push({
            ...data,
            timestamp: admin.database.ServerValue.TIMESTAMP
          });
          break;
          
        case 'track-user':
          await adminDb.ref(`activeUsers/${data.userId}`).set({
            ...data,
            timestamp: admin.database.ServerValue.TIMESTAMP
          });
          break;
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Realtime tracking error:', error);
      return res.status(500).json({ message: 'Failed to track event' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
```

### 6. Frontend Real-time Hook
```javascript
// hooks/useRealtimeAnalytics.js
import { useState, useEffect } from 'react';
import { subscribeToActiveUsers, subscribeToRealtimeSales } from '../lib/firebase-analytics';

export const useRealtimeAnalytics = () => {
  const [activeUsers, setActiveUsers] = useState({ activeCount: 0, usersList: [] });
  const [recentSales, setRecentSales] = useState([]);
  const [todayMetrics, setTodayMetrics] = useState({
    revenue: 0,
    orders: 0,
    visitors: 0
  });

  useEffect(() => {
    // Subscribe to active users
    const unsubscribeUsers = subscribeToActiveUsers(setActiveUsers);
    
    // Subscribe to real-time sales
    const unsubscribeSales = subscribeToRealtimeSales(setRecentSales);
    
    // Fetch today's metrics every minute
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/analytics/realtime?type=metrics');
        const metrics = await response.json();
        setTodayMetrics(metrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };
    
    fetchMetrics();
    const metricsInterval = setInterval(fetchMetrics, 60000);
    
    return () => {
      unsubscribeUsers();
      unsubscribeSales();
      clearInterval(metricsInterval);
    };
  }, []);

  return {
    activeUsers,
    recentSales,
    todayMetrics
  };
};
```
