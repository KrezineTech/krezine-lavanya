# cURL Command Examples for Messaging API Testing

## Overview
This document provides comprehensive cURL commands for testing all messaging API endpoints manually.

## Environment Setup
```bash
# Set base URL for convenience
export BASE_URL="http://localhost:3000"

# Test customer data
export CUSTOMER_NAME="John Doe"
export CUSTOMER_EMAIL="john.doe@example.com"

# This will be set after creating a thread
export THREAD_ID=""
export MESSAGE_ID=""
```

## Customer Endpoints

### 1. Get Message Threads
```bash
# Basic request
curl -X GET "${BASE_URL}/api/messages" \
  -H "Content-Type: application/json"

# With pagination
curl -X GET "${BASE_URL}/api/messages?page=1&limit=10" \
  -H "Content-Type: application/json"

# With search
curl -X GET "${BASE_URL}/api/messages?search=order" \
  -H "Content-Type: application/json"

# Full example with all parameters
curl -X GET "${BASE_URL}/api/messages?page=1&limit=5&search=test" \
  -H "Content-Type: application/json" \
  | jq '.'
```

### 2. Create Message Thread
```bash
# Basic thread creation
curl -X POST "${BASE_URL}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Thread from cURL",
    "customerName": "'"${CUSTOMER_NAME}"'",
    "customerEmail": "'"${CUSTOMER_EMAIL}"'",
    "initialMessage": "This is a test message created using cURL to verify the API functionality.",
    "priority": "MEDIUM"
  }' | jq '.'

# Order-related thread
curl -X POST "${BASE_URL}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Order Issue - Need Help",
    "customerName": "Jane Smith",
    "customerEmail": "jane.smith@example.com",
    "initialMessage": "I have an issue with my recent order and need assistance.",
    "isOrderRelated": true,
    "orderId": "ORD-12345",
    "priority": "HIGH"
  }' | jq '.'

# High priority thread
curl -X POST "${BASE_URL}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Urgent: Payment Issue",
    "customerName": "Bob Johnson",
    "customerEmail": "bob.johnson@example.com",
    "initialMessage": "I was charged twice for my order and need immediate assistance.",
    "priority": "URGENT"
  }' | jq '.'

# Extract thread ID from response (save to variable)
export THREAD_ID=$(curl -s -X POST "${BASE_URL}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Thread",
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "initialMessage": "Test message",
    "priority": "MEDIUM"
  }' | jq -r '.thread.id')

echo "Created thread ID: $THREAD_ID"
```

### 3. Get Thread Messages
```bash
# Get messages for a specific thread
curl -X GET "${BASE_URL}/api/messages/${THREAD_ID}/messages" \
  -H "Content-Type: application/json" \
  | jq '.'

# With error handling
curl -X GET "${BASE_URL}/api/messages/nonexistent-thread/messages" \
  -H "Content-Type: application/json" \
  -w "HTTP Status: %{http_code}\n"
```

### 4. Send Message
```bash
# Send a text message
curl -X POST "${BASE_URL}/api/messages/${THREAD_ID}/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Thank you for your quick response! This is very helpful.",
    "senderType": "CUSTOMER"
  }' | jq '.'

# Send a longer message
curl -X POST "${BASE_URL}/api/messages/${THREAD_ID}/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I wanted to provide more details about my issue. I placed an order last week and received a confirmation email, but the tracking number provided doesn'\''t seem to work. Could you please check the status of my order and provide an updated tracking number?",
    "senderType": "CUSTOMER"
  }' | jq '.'

# Extract message ID from response
export MESSAGE_ID=$(curl -s -X POST "${BASE_URL}/api/messages/${THREAD_ID}/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test message for ID extraction",
    "senderType": "CUSTOMER"
  }' | jq -r '.message.id')

echo "Created message ID: $MESSAGE_ID"
```

### 5. Send Message with File Attachment
```bash
# Create a test file
echo "This is a test document for API testing." > test-document.txt

# Send message with file attachment
curl -X POST "${BASE_URL}/api/messages/${THREAD_ID}/messages" \
  -F "content=Please see the attached document for more details." \
  -F "senderType=CUSTOMER" \
  -F "attachments=@test-document.txt" \
  | jq '.'

# Multiple files
echo "Invoice details here" > invoice.txt
echo "Receipt information" > receipt.txt

curl -X POST "${BASE_URL}/api/messages/${THREAD_ID}/messages" \
  -F "content=Attaching both invoice and receipt for your review." \
  -F "senderType=CUSTOMER" \
  -F "attachments=@invoice.txt" \
  -F "attachments=@receipt.txt" \
  | jq '.'

# Cleanup test files
rm test-document.txt invoice.txt receipt.txt
```

### 6. Mark Messages as Read
```bash
# Mark specific messages as read
curl -X POST "${BASE_URL}/api/messages/${THREAD_ID}/mark-read" \
  -H "Content-Type: application/json" \
  -d '{
    "messageIds": ["'"${MESSAGE_ID}"'"]
  }' | jq '.'

# Mark all messages in thread as read
curl -X POST "${BASE_URL}/api/messages/${THREAD_ID}/mark-read" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | jq '.'
```

### 7. Real-time Updates (Long Polling)
```bash
# Check for updates since a specific timestamp
curl -X GET "${BASE_URL}/api/messages/realtime?lastCheck=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -H "Content-Type: application/json" \
  | jq '.'

# Check for updates with a past timestamp to see existing data
curl -X GET "${BASE_URL}/api/messages/realtime?lastCheck=2025-09-01T00:00:00Z" \
  -H "Content-Type: application/json" \
  | jq '.'
```

## Admin Endpoints

### 1. Get All Threads (Admin)
```bash
# Basic admin request (requires auth token)
curl -X GET "${BASE_URL}/api/admin/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  | jq '.'

# With filters
curl -X GET "${BASE_URL}/api/admin/messages?status=OPEN&priority=HIGH" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  | jq '.'

# Order-related threads only
curl -X GET "${BASE_URL}/api/admin/messages?isOrderRelated=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  | jq '.'

# Search with pagination
curl -X GET "${BASE_URL}/api/admin/messages?search=urgent&page=1&limit=5" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  | jq '.'
```

### 2. Update Thread Status
```bash
# Update thread status
curl -X PATCH "${BASE_URL}/api/admin/messages/${THREAD_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "status": "IN_PROGRESS",
    "assignedAdmin": "admin_user_123"
  }' | jq '.'

# Update priority and add private note
curl -X PATCH "${BASE_URL}/api/admin/messages/${THREAD_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "priority": "HIGH",
    "privateNote": "Customer seems very frustrated. Prioritize this case for immediate attention."
  }' | jq '.'

# Resolve thread
curl -X PATCH "${BASE_URL}/api/admin/messages/${THREAD_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "status": "RESOLVED",
    "privateNote": "Issue resolved. Customer was satisfied with the solution provided."
  }' | jq '.'
```

### 3. Send Admin Reply
```bash
# Send admin response
curl -X POST "${BASE_URL}/api/admin/messages/${THREAD_ID}/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "content": "Hello! Thank you for contacting our support team. I have reviewed your inquiry and I will be happy to assist you with this matter.",
    "senderType": "ADMIN"
  }' | jq '.'

# Send detailed admin response
curl -X POST "${BASE_URL}/api/admin/messages/${THREAD_ID}/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "content": "I have checked your order status and can confirm that your package is currently in transit. The tracking number TS123456789 is now active and you should be able to track your shipment. Expected delivery is within 2-3 business days. Please let me know if you have any other questions!",
    "senderType": "ADMIN"
  }' | jq '.'
```

### 4. Bulk Operations
```bash
# Bulk update thread status
curl -X PATCH "${BASE_URL}/api/admin/bulk/threads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "threadIds": ["'"${THREAD_ID}"'"],
    "updates": {
      "status": "RESOLVED",
      "assignedAdmin": "admin_user_123"
    }
  }' | jq '.'

# Bulk delete threads
curl -X DELETE "${BASE_URL}/api/admin/bulk/threads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "threadIds": ["thread_to_delete_1", "thread_to_delete_2"]
  }' | jq '.'
```

## Quick Replies Management

### 1. Get Quick Replies
```bash
curl -X GET "${BASE_URL}/api/admin/quick-replies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  | jq '.'
```

### 2. Create Quick Reply
```bash
curl -X POST "${BASE_URL}/api/admin/quick-replies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "title": "Order Status Inquiry",
    "content": "Thank you for your inquiry about your order status. Let me check that for you right away and provide you with an update.",
    "category": "orders",
    "isActive": true
  }' | jq '.'

# Create shipping-related quick reply
curl -X POST "${BASE_URL}/api/admin/quick-replies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "title": "Shipping Information",
    "content": "Your order has been shipped and you should receive it within 3-5 business days. Here is your tracking number: {tracking_number}. You can track your package at our shipping partner'\''s website.",
    "category": "shipping",
    "isActive": true
  }' | jq '.'
```

### 3. Update Quick Reply
```bash
export QUICK_REPLY_ID="qr_123"

curl -X PATCH "${BASE_URL}/api/admin/quick-replies/${QUICK_REPLY_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "title": "Updated Order Status",
    "content": "Thank you for contacting us about your order. I have updated your order status and you should receive an email confirmation shortly with tracking information.",
    "isActive": true
  }' | jq '.'
```

### 4. Delete Quick Reply
```bash
curl -X DELETE "${BASE_URL}/api/admin/quick-replies/${QUICK_REPLY_ID}" \
  -H "Authorization: Bearer admin-token" \
  -w "HTTP Status: %{http_code}\n"
```

## Labels Management

### 1. Get Labels
```bash
curl -X GET "${BASE_URL}/api/admin/labels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  | jq '.'
```

### 2. Create Label
```bash
curl -X POST "${BASE_URL}/api/admin/labels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "name": "VIP Customer",
    "color": "#ff6b35"
  }' | jq '.'

# Create multiple labels
curl -X POST "${BASE_URL}/api/admin/labels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "name": "Urgent",
    "color": "#ff0000"
  }' | jq '.'

curl -X POST "${BASE_URL}/api/admin/labels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "name": "Billing Issue",
    "color": "#ffa500"
  }' | jq '.'
```

### 3. Update Label
```bash
export LABEL_ID="label_123"

curl -X PATCH "${BASE_URL}/api/admin/labels/${LABEL_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "name": "Premium Customer",
    "color": "#gold"
  }' | jq '.'
```

### 4. Delete Label
```bash
curl -X DELETE "${BASE_URL}/api/admin/labels/${LABEL_ID}" \
  -H "Authorization: Bearer admin-token" \
  -w "HTTP Status: %{http_code}\n"
```

## Error Testing

### 1. Invalid Requests
```bash
# Invalid thread creation (missing required fields)
curl -X POST "${BASE_URL}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "",
    "customerName": "",
    "customerEmail": "invalid-email",
    "initialMessage": ""
  }' \
  -w "HTTP Status: %{http_code}\n" | jq '.'

# Non-existent thread
curl -X GET "${BASE_URL}/api/messages/nonexistent-thread-id/messages" \
  -H "Content-Type: application/json" \
  -w "HTTP Status: %{http_code}\n"

# Unauthorized admin access
curl -X GET "${BASE_URL}/api/admin/messages" \
  -H "Content-Type: application/json" \
  -w "HTTP Status: %{http_code}\n"
```

### 2. Malformed Data
```bash
# Invalid JSON
curl -X POST "${BASE_URL}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"invalid": json}' \
  -w "HTTP Status: %{http_code}\n"

# Oversized content
curl -X POST "${BASE_URL}/api/messages/${THREAD_ID}/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "'$(printf 'x%.0s' {1..10001})'",
    "senderType": "CUSTOMER"
  }' \
  -w "HTTP Status: %{http_code}\n"
```

## Performance Testing

### 1. Concurrent Requests
```bash
# Run multiple requests in parallel
for i in {1..10}; do
  curl -X GET "${BASE_URL}/api/messages" \
    -H "Content-Type: application/json" \
    -w "Request $i - Time: %{time_total}s, Status: %{http_code}\n" \
    -o /dev/null -s &
done
wait
```

### 2. Large Dataset Testing
```bash
# Create multiple threads for testing
for i in {1..20}; do
  curl -X POST "${BASE_URL}/api/messages" \
    -H "Content-Type: application/json" \
    -d '{
      "subject": "Test Thread #'$i'",
      "customerName": "Test User '$i'",
      "customerEmail": "test'$i'@example.com",
      "initialMessage": "This is test thread number '$i' for performance testing.",
      "priority": "MEDIUM"
    }' \
    -o /dev/null -s &
  
  # Add small delay to avoid overwhelming the server
  sleep 0.1
done
wait

echo "Created 20 test threads"
```

## Cleanup
```bash
# Note: Add cleanup endpoints if available
echo "Remember to clean up test data after testing"
echo "Thread ID used: $THREAD_ID"
echo "Message ID used: $MESSAGE_ID"

# Unset environment variables
unset BASE_URL CUSTOMER_NAME CUSTOMER_EMAIL THREAD_ID MESSAGE_ID QUICK_REPLY_ID LABEL_ID
```

## Tips for Using These Commands

1. **Save Thread IDs**: Always capture thread IDs from creation responses for follow-up tests
2. **Check Status Codes**: Use `-w "HTTP Status: %{http_code}\n"` to see response codes
3. **Pretty Print JSON**: Pipe responses to `jq '.'` for readable output
4. **Error Handling**: Test both success and failure scenarios
5. **Performance Monitoring**: Use `-w` flag to monitor response times
6. **Concurrent Testing**: Use background processes (`&`) to test concurrent load
7. **File Cleanup**: Remember to clean up any test files created

## Environment Variables for Production Testing
```bash
# For testing against different environments
export BASE_URL="https://your-production-api.com"
export ADMIN_TOKEN="your-actual-admin-token"

# Use in commands like:
# curl -H "Authorization: Bearer ${ADMIN_TOKEN}" ...
```