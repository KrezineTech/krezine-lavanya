# Orders & Shipping System Documentation

## Overview

This comprehensive Orders & Shipping system provides end-to-end order management capabilities for the admin interface, including payment processing, fulfillment, shipping, refunds, and customer notifications.

## Architecture

### Core Components

1. **Database Models** (Prisma Schema)
   - `Order` - Main order entity with payment/fulfillment status
   - `OrderItem` - Individual items within orders
   - `Address` - Billing and shipping addresses
   - `Payment` - Payment processing records
   - `Shipment` - Shipping and tracking information
   - `TrackingEvent` - Shipment tracking history
   - `Refund` - Refund processing records
   - `AuditLog` - Complete audit trail of all operations

2. **Service Layer**
   - `OrderService` - Core business logic for order operations
   - `ShippingService` - Shipping provider abstraction (EasyPost)
   - `PaymentService` - Payment provider abstraction (Stripe)
   - `EmailService` - Customer notification system

3. **API Layer**
   - RESTful endpoints under `/pages/api/`
   - Request validation using Zod schemas
   - Authentication and authorization middleware
   - Rate limiting and CORS protection

## Order Status Model

### Payment Status Flow
```
PENDING → AUTHORIZED → CAPTURED → PARTIALLY_REFUNDED/REFUNDED
       ↘              ↗
         VOIDED/FAILED
```

### Fulfillment Status Flow
```
UNFULFILLED → PARTIALLY_FULFILLED → FULFILLED → PARTIALLY_DELIVERED → DELIVERED
           ↘                                                        ↗
             CANCELLED ----------------------------------------↗
```

### Shipment Status Flow
```
PENDING → LABEL_CREATED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
       ↘                                      ↗
         CANCELLED                    EXCEPTION
```

## API Endpoints

### Orders Management

#### `GET /api/orders`
List orders with filtering, sorting, and pagination.

**Query Parameters:**
- `paymentStatus[]` - Filter by payment status
- `fulfillmentStatus[]` - Filter by fulfillment status
- `q` - Search order number, email, or tracking number
- `from` / `to` - Date range filter
- `minTotal` / `maxTotal` - Order total range
- `sort` - Sort field (createdAt, grandTotalCents, number)
- `direction` - Sort direction (asc, desc)
- `page` / `pageSize` - Pagination

**Example Response:**
```json
{
  "orders": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### `GET /api/orders/:id`
Get detailed order information including items, payments, shipments, and addresses.

#### `PATCH /api/orders/:id`
Update order metadata (tags, notes).

**Request Body:**
```json
{
  "tags": ["rush", "vip"],
  "notes": "Customer requested expedited shipping"
}
```

### Fulfillment Operations

#### `POST /api/orders/:id/fulfill`
Create fulfillment and purchase shipping label.

**Request Body:**
```json
{
  "items": [
    {
      "orderItemId": "item_123",
      "quantity": 2
    }
  ],
  "carrier": "ups",
  "service": "ground",
  "options": {
    "signature": true,
    "insurance": false
  }
}
```

**Response:**
```json
{
  "id": "shipment_123",
  "trackingNumber": "1Z999AA1234567890",
  "labelUrl": "https://...",
  "costCents": 899,
  "estimatedDelivery": "2024-01-15T00:00:00Z"
}
```

### Payment Operations

#### `POST /api/payments/:orderId/capture`
Capture authorized payment.

**Request Body:**
```json
{
  "amountCents": 5000  // Optional, captures full amount if not specified
}
```

#### `POST /api/payments/:orderId/refund`
Process refund for captured payment.

**Request Body:**
```json
{
  "amountCents": 2500,
  "reason": "Defective item",
  "items": [
    {
      "orderItemId": "item_123",
      "quantity": 1
    }
  ]
}
```

### Shipping Operations

#### `POST /api/shipping/quote-rates`
Get shipping rate quotes.

**Request Body:**
```json
{
  "fromAddressId": "addr_warehouse",
  "toAddressId": "addr_customer",
  "items": [
    {
      "name": "Product Name",
      "quantity": 1,
      "weightGrams": 500,
      "valueCents": 5000
    }
  ],
  "options": {
    "signature": false,
    "insurance": true
  }
}
```

### Notifications

#### `POST /api/notifications/:orderId/resend`
Send order notification email.

**Request Body:**
```json
{
  "type": "order_shipped",
  "customMessage": "Your package is on the way!"
}
```

**Notification Types:**
- `order_confirmation` - Order received confirmation
- `payment_received` - Payment processed notification
- `order_shipped` - Shipment notification with tracking
- `order_delivered` - Delivery confirmation
- `refund_processed` - Refund processed notification

### Export & Reporting

#### `POST /api/orders/export`
Export orders to CSV.

**Request Body:**
```json
{
  "filters": {
    "from": "2024-01-01",
    "to": "2024-01-31",
    "fulfillmentStatus": ["FULFILLED", "DELIVERED"]
  }
}
```

#### `GET /api/orders/:id/audit-logs`
Get audit trail for order.

**Query Parameters:**
- `entityType` - Filter by entity (order, payment, shipment)
- `actor` - Filter by actor
- `action` - Filter by action
- `from` / `to` - Date range
- `limit` - Max results (default 50, max 100)

### Webhooks

#### `POST /api/webhooks/payments`
Handle payment provider webhooks (Stripe).

**Supported Events:**
- `payment_intent.succeeded` - Payment captured
- `payment_intent.payment_failed` - Payment failed
- `charge.dispute.created` - Chargeback dispute

#### `POST /api/webhooks/shipping`
Handle shipping provider webhooks (EasyPost).

**Request Body:**
```json
{
  "tracking_number": "1Z999AA1234567890",
  "status": "delivered",
  "description": "Package delivered",
  "location": "San Francisco, CA",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Authentication & Authorization

### Middleware
All API endpoints use authentication middleware with role-based access control.

**Headers Required:**
- `Authorization: Bearer <token>` OR
- `X-API-Key: <api_key>`
- `X-Admin-ID: <admin_user_id>` (for audit logging)

### Roles & Permissions

1. **Viewer** - Read-only access
   - View orders, shipments, audit logs

2. **Manager** - Order management
   - All viewer permissions
   - Update orders, create fulfillments
   - Send notifications

3. **Finance** - Payment operations
   - All viewer permissions
   - Capture payments, process refunds

4. **Admin** - Full access
   - All operations
   - Export data
   - System administration

## Service Integrations

### Shipping Providers

#### EasyPost Integration
- Rate shopping across carriers
- Label generation and purchase
- Address validation
- Tracking updates via webhooks

**Environment Variables:**
```
SHIPPING_PROVIDER=easypost
EASYPOST_API_KEY=your_api_key
```

### Payment Providers

#### Stripe Integration
- Payment authorization and capture
- Refund processing
- Webhook signature verification

**Environment Variables:**
```
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Email Service

#### Nodemailer Integration
- Transactional email sending
- Template rendering
- Customer notifications

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `409` - Conflict (business logic violations)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Validation

Request validation uses Zod schemas with detailed error messages. All input is validated before processing.

## Audit Trail

Complete audit logging for compliance and debugging:

```json
{
  "id": "log_123",
  "orderId": "order_123",
  "entityType": "payment",
  "entityId": "payment_123",
  "action": "captured",
  "actor": "admin_456",
  "actorType": "admin",
  "changes": {
    "amountCents": 5000,
    "status": "CAPTURED"
  },
  "correlationId": "req_789",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Security Features

1. **Authentication** - Token-based auth with role verification
2. **Authorization** - Granular permission system
3. **Rate Limiting** - API request throttling
4. **Input Validation** - Comprehensive request validation
5. **Audit Logging** - Complete activity tracking
6. **CORS Protection** - Controlled cross-origin access
7. **Webhook Verification** - Signature validation for webhooks

## Performance Considerations

1. **Database Indexing** - Optimized queries with proper indexes
2. **Pagination** - Cursor-based pagination for large datasets
3. **Caching** - Response caching for static data
4. **Batch Operations** - Bulk updates and exports
5. **Background Jobs** - Async processing for heavy operations

## Monitoring & Observability

1. **Request Logging** - All API calls logged with timing
2. **Error Tracking** - Detailed error logging and alerting
3. **Metrics Collection** - Key business metrics tracking
4. **Health Checks** - Service availability monitoring

## Deployment

### Environment Variables
```
# Database
DATABASE_URL=postgresql://...

# Shipping
SHIPPING_PROVIDER=easypost
EASYPOST_API_KEY=...

# Payments
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# Admin
ADMIN_FRONTEND_URL=https://admin.example.com
JWT_SECRET=...
```

### Database Migration
```bash
npx prisma migrate deploy
npx prisma generate
```

### Running the System
```bash
npm run build
npm start
```

## Testing

### API Testing
- Unit tests for service layer
- Integration tests for API endpoints
- End-to-end order flow testing

### Testing Tools
- Jest for unit tests
- Supertest for API testing
- Prisma testing utilities

## Future Enhancements

1. **Multi-warehouse Support** - Route fulfillment to different locations
2. **Advanced Inventory** - Stock allocation and backorder handling
3. **Returns Management** - Return request and processing workflows
4. **Advanced Reporting** - Business intelligence dashboards
5. **Real-time Updates** - WebSocket notifications for status changes
6. **Mobile API** - REST API optimized for mobile apps
7. **GraphQL Support** - GraphQL interface for flexible querying

## Support

For questions or issues with the Orders & Shipping system:

1. Check the API documentation
2. Review audit logs for debugging
3. Monitor error logs and metrics
4. Contact the development team with detailed error information

This system provides a complete foundation for e-commerce order management with room for future expansion and customization based on business requirements.
