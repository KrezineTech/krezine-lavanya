import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/prisma';

// Persistent file storage for orders
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

// Ensure data directory exists
const dataDir = path.dirname(ORDERS_FILE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper functions for persistent storage
function loadOrders(): any[] {
  try {
    if (fs.existsSync(ORDERS_FILE_PATH)) {
      const data = fs.readFileSync(ORDERS_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading orders:', error);
  }
  return [];
}

function saveOrders(orders: any[]): void {
  try {
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error saving orders:', error);
  }
}

// Helper function to convert cents to currency amounts for database
function convertToCents(amount: number): number {
  return Math.round(amount * 100);
}

// Helper function to persist order to database
async function persistOrderToDatabase(orderData: any): Promise<void> {
  try {
    // Parse totalPrice to get amount in base currency
    const totalAmount = parseFloat(orderData.totalPrice?.replace(/[^\d.]/g, '') || '0');
    
    // Create order in database
    const dbOrder = await prisma.order.create({
      data: {
        number: orderData.id.replace('#', 'ORD-'), // Remove # and add ORD prefix
        userId: orderData.userId || null, // Associate with user if userId provided
        guestEmail: orderData.userId ? null : orderData.customerEmail, // Only set guest email if no user
        customerName: orderData.customerName,
        subtotalCents: convertToCents(orderData.subtotal || 0),
        shippingCents: convertToCents(parseFloat(orderData.shipping?.cost?.replace(/[^\d.]/g, '') || '0')),
        taxCents: convertToCents(orderData.tax || 0),
        grandTotalCents: convertToCents(totalAmount),
        currency: 'USD',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        metadata: {
          frontendOrderId: orderData.id,
          isGift: orderData.isGift || false,
          isPersonalizable: orderData.isPersonalizable || false,
          destinationCountry: orderData.destinationCountry,
        },
        items: {
          create: orderData.items?.map((item: any) => ({
            name: item.name,
            priceCents: convertToCents(item.price || 0),
            quantity: item.quantity,
            sku: item.sku,
            metadata: {
              image: item.image,
              total: item.total
            }
          })) || []
        }
      },
      include: {
        items: true
      }
    });

    console.log(`✅ Order ${orderData.id} persisted to database with ID: ${dbOrder.id}`);
    
    // If userId provided, log the user association
    if (orderData.userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: orderData.userId },
          select: { email: true, id: true }
        });
        if (user) {
          console.log(`👤 Order associated with user: ${user.email} (${user.id})`);
        }
      } catch (userError) {
        console.warn('⚠️ Could not fetch user details for logging:', userError);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to persist order to database:', error);
    throw error; // Re-throw to be handled by caller
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const orderData = req.body;
      
      // Validate required order data
      if (!orderData.id || !orderData.customerEmail) {
        return res.status(400).json({ 
          error: 'Missing required order data: id and customerEmail are required' 
        });
      }
      
      // Load existing orders for file storage
      const orders = loadOrders();
      
      // Check if order already exists (prevent duplicates)
      const existingIndex = orders.findIndex(order => order.id === orderData.id);
      if (existingIndex >= 0) {
        // Update existing order in file storage
        orders[existingIndex] = orderData;
        console.log('📄 Order updated in file storage:', orderData.id);
      } else {
        // Add new order to file storage
        orders.push(orderData);
        console.log('📄 Order synced to file storage:', orderData.id);
      }
      
      // Save orders to persistent file storage
      saveOrders(orders);
      
      // Persist order to database (with user association if userId provided)
      try {
        await persistOrderToDatabase(orderData);
      } catch (dbError) {
        console.error('⚠️ Database persistence failed, but file storage succeeded:', dbError);
        // Don't fail the entire request if database fails - file storage is backup
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Order synced successfully',
        orderId: orderData.id,
        userId: orderData.userId || null
      });
    } catch (error) {
      console.error('Order sync error:', error);
      return res.status(500).json({ error: 'Failed to sync order' });
    }
  }

  if (req.method === 'GET') {
    const orders = loadOrders();
    return res.status(200).json({ orders });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
