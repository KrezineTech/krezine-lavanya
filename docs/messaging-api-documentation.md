# Messaging System API Documentation

## Overview
Production-ready messaging system API for customer support with real-time capabilities, file attachments, and admin management.

## Base URLs
- **Frontend**: `/api/messages`
- **Admin**: `/api/admin/messages`

## Authentication
- Customer endpoints: No authentication required initially (hooks ready for future auth)
- Admin endpoints: Authentication required (implement as needed)

## API Endpoints

### Customer Endpoints

#### Get Message Threads
```http
GET /api/messages
```

**Query Parameters:**
- `search` (string, optional): Search in customer names and thread subjects
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 50)

**Response:**
```json
{
  "threads": [
    {
      "id": "thread_123",
      "subject": "Order inquiry",
      "status": "OPEN",
      "priority": "MEDIUM",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "isOrderRelated": true,
      "orderId": "ORD-12345",
      "createdAt": "2025-09-14T10:00:00Z",
      "updatedAt": "2025-09-14T11:30:00Z",
      "unreadCount": 2,
      "lastMessageAt": "2025-09-14T11:30:00Z",
      "lastMessagePreview": "Thank you for your help..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### Create Message Thread
```http
POST /api/messages
```

**Request Body:**
```json
{
  "subject": "Order inquiry",
  "customerName": "John Doe", 
  "customerEmail": "john@example.com",
  "initialMessage": "I have a question about my order",
  "isOrderRelated": true,
  "orderId": "ORD-12345",
  "priority": "MEDIUM"
}
```

**Response:**
```json
{
  "thread": {
    "id": "thread_123",
    "subject": "Order inquiry",
    "status": "OPEN",
    "priority": "MEDIUM",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "isOrderRelated": true,
    "orderId": "ORD-12345",
    "createdAt": "2025-09-14T10:00:00Z",
    "updatedAt": "2025-09-14T10:00:00Z",
    "unreadCount": 0,
    "lastMessageAt": "2025-09-14T10:00:00Z",
    "lastMessagePreview": "I have a question about my order"
  }
}
```

#### Get Thread Messages
```http
GET /api/messages/{threadId}/messages
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "threadId": "thread_123",
      "content": "I have a question about my order",
      "senderType": "CUSTOMER",
      "senderName": "John Doe",
      "senderEmail": "john@example.com",
      "isRead": true,
      "createdAt": "2025-09-14T10:00:00Z",
      "attachments": []
    }
  ]
}
```

#### Send Message
```http
POST /api/messages/{threadId}/messages
```

**Content-Type**: `application/json` or `multipart/form-data` (for attachments)

**Request Body (JSON):**
```json
{
  "content": "Thank you for your help!",
  "senderType": "CUSTOMER"
}
```

**Request Body (FormData with attachments):**
```
content: "Please see attached invoice"
senderType: "CUSTOMER"
attachments: [File objects]
```

**Response:**
```json
{
  "message": {
    "id": "msg_124",
    "threadId": "thread_123",
    "content": "Thank you for your help!",
    "senderType": "CUSTOMER",
    "senderName": "John Doe",
    "senderEmail": "john@example.com",
    "isRead": false,
    "createdAt": "2025-09-14T11:30:00Z",
    "attachments": []
  }
}
```

#### Real-time Updates (Long Polling)
```http
GET /api/messages/realtime?lastCheck=2025-09-14T11:00:00Z
```

**Response:**
```json
{
  "updates": [
    {
      "type": "new_message",
      "threadId": "thread_123",
      "message": {
        "id": "msg_125",
        "content": "We've processed your order",
        "senderType": "ADMIN",
        "senderName": "Support Team",
        "createdAt": "2025-09-14T11:35:00Z"
      }
    }
  ],
  "timestamp": "2025-09-14T11:35:00Z"
}
```

### Admin Endpoints

#### Get All Threads (Admin)
```http
GET /api/admin/messages
```

**Query Parameters:**
- `search` (string): Search query
- `status` (string): Filter by status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`)
- `priority` (string): Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `isOrderRelated` (boolean): Filter order-related threads
- `assignedAdmin` (string): Filter by assigned admin
- `labelIds` (array): Filter by label IDs
- `dateFrom` (string): Date range start (ISO format)
- `dateTo` (string): Date range end (ISO format)
- `sortBy` (string): Sort field (`createdAt`, `updatedAt`, `priority`)
- `sortOrder` (string): Sort direction (`asc`, `desc`)
- `page` (number): Page number
- `limit` (number): Items per page

#### Update Thread Status
```http
PATCH /api/admin/messages/{threadId}
```

**Request Body:**
```json
{
  "status": "RESOLVED",
  "priority": "HIGH",
  "assignedAdmin": "admin_user_123",
  "privateNote": "Customer was very satisfied with resolution"
}
```

#### Bulk Operations
```http
PATCH /api/admin/bulk/threads
```

**Request Body:**
```json
{
  "threadIds": ["thread_123", "thread_124"],
  "updates": {
    "status": "RESOLVED",
    "assignedAdmin": "admin_user_123"
  }
}
```

#### Quick Replies Management
```http
GET /api/admin/quick-replies
POST /api/admin/quick-replies
PATCH /api/admin/quick-replies/{id}
DELETE /api/admin/quick-replies/{id}
```

#### Labels Management
```http
GET /api/admin/labels
POST /api/admin/labels
PATCH /api/admin/labels/{id}
DELETE /api/admin/labels/{id}
```

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

- **Customer endpoints**: 100 requests per hour per IP
- **Admin endpoints**: 1000 requests per hour per user
- **File uploads**: 10 files per minute per user
- **Real-time polling**: 1 request per 3 seconds

## File Attachments

**Supported formats**: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF
**Maximum file size**: 10MB per file
**Maximum files per message**: 5 files

## Database Schema

### MessageThread
```sql
CREATE TABLE MessageThread (
  id VARCHAR(255) PRIMARY KEY,
  subject VARCHAR(500) NOT NULL,
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  customerName VARCHAR(255) NOT NULL,
  customerEmail VARCHAR(255) NOT NULL,
  isOrderRelated BOOLEAN DEFAULT FALSE,
  orderId VARCHAR(255),
  totalPurchased DECIMAL(10,2),
  assignedAdmin VARCHAR(255),
  privateNote TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_customer_email (customerEmail),
  INDEX idx_status_priority (status, priority),
  INDEX idx_created_at (createdAt),
  INDEX idx_assigned_admin (assignedAdmin),
  INDEX idx_order_related (isOrderRelated, orderId)
);
```

### ConversationMessage
```sql
CREATE TABLE ConversationMessage (
  id VARCHAR(255) PRIMARY KEY,
  threadId VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  senderType ENUM('CUSTOMER', 'ADMIN', 'SYSTEM') NOT NULL,
  senderName VARCHAR(255) NOT NULL,
  senderEmail VARCHAR(255),
  isRead BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (threadId) REFERENCES MessageThread(id) ON DELETE CASCADE,
  INDEX idx_thread_created (threadId, createdAt),
  INDEX idx_unread (threadId, isRead, createdAt)
);
```

## Performance Optimizations

1. **Database Indexes**: Optimized for common query patterns
2. **Pagination**: All list endpoints support pagination
3. **Caching**: Redis caching for frequently accessed data
4. **File Storage**: Cloud storage for attachments with CDN
5. **Long Polling**: Efficient real-time updates without WebSocket overhead

## Security Measures

1. **Input Validation**: Zod schema validation on all inputs
2. **SQL Injection Protection**: Prisma ORM with parameterized queries
3. **XSS Prevention**: Content sanitization and CSP headers
4. **File Upload Security**: Type validation, size limits, virus scanning
5. **Rate Limiting**: IP-based and user-based rate limiting
6. **CORS**: Proper CORS configuration for production

## Monitoring & Logging

1. **Error Tracking**: Comprehensive error logging with stack traces
2. **Performance Metrics**: Response time and query performance monitoring
3. **Usage Analytics**: API endpoint usage statistics
4. **Health Checks**: Database connectivity and system health monitoring