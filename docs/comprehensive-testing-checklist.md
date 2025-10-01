# Messaging System Testing Checklist

## Overview
This checklist ensures comprehensive testing of the messaging system API before production deployment.

## Pre-Test Setup
- [ ] Database is running and accessible
- [ ] API server is running on localhost:3000
- [ ] Test data is cleared/reset
- [ ] Postman collection is imported
- [ ] Environment variables are set

## Unit Tests
### Validation Functions
- [ ] validateCreateThread with valid data
- [ ] validateCreateThread with empty subject
- [ ] validateCreateThread with invalid email
- [ ] validateCreateThread with missing fields
- [ ] validateCreateThread with oversized content
- [ ] validateSendMessage with valid data
- [ ] validateSendMessage with empty content
- [ ] validateSendMessage with invalid sender type

### Business Logic Functions
- [ ] calculateUnreadCount with mixed messages
- [ ] calculateUnreadCount with empty array
- [ ] generateThreadPreview with normal content
- [ ] generateThreadPreview with long content
- [ ] generateThreadPreview with null message
- [ ] calculatePriorityScore for different priorities
- [ ] calculatePriorityScore with aging
- [ ] sanitizeContent with HTML tags
- [ ] sanitizeContent with quotes and special chars

## Integration Tests
### Customer Endpoints

#### GET /api/messages
- [ ] Returns threads with proper pagination
- [ ] Handles search parameter correctly
- [ ] Respects page/limit parameters
- [ ] Returns 200 with empty results
- [ ] Performance acceptable (<200ms for 10 threads)

#### POST /api/messages
- [ ] Creates thread with valid data
- [ ] Returns 201 with thread object
- [ ] Validates required fields
- [ ] Returns 400 for invalid data
- [ ] Creates initial message automatically
- [ ] Handles optional fields correctly

#### GET /api/messages/{threadId}/messages
- [ ] Returns messages for existing thread
- [ ] Returns messages in chronological order
- [ ] Includes attachment information
- [ ] Returns 404 for non-existent thread
- [ ] Performance acceptable (<100ms for 50 messages)

#### POST /api/messages/{threadId}/messages
- [ ] Sends message to existing thread
- [ ] Returns 201 with message object
- [ ] Handles JSON content correctly
- [ ] Handles FormData with attachments
- [ ] Validates message content
- [ ] Updates thread lastMessageAt
- [ ] Returns 404 for non-existent thread

#### POST /api/messages/{threadId}/mark-read
- [ ] Marks specific messages as read
- [ ] Marks all messages as read when no IDs provided
- [ ] Updates thread unread count
- [ ] Returns 200 on success
- [ ] Returns 404 for non-existent thread

#### GET /api/messages/realtime
- [ ] Returns updates since lastCheck timestamp
- [ ] Returns empty array when no updates
- [ ] Includes all relevant update types
- [ ] Handles malformed timestamp
- [ ] Performance acceptable (<3 seconds response)

### Admin Endpoints

#### GET /api/admin/messages
- [ ] Returns all threads for admin
- [ ] Applies status filter correctly
- [ ] Applies priority filter correctly
- [ ] Applies order-related filter correctly
- [ ] Handles search across customer names and subjects
- [ ] Applies date range filters
- [ ] Sorts by specified field and order
- [ ] Pagination works correctly
- [ ] Returns proper counts and metadata

#### PATCH /api/admin/messages/{threadId}
- [ ] Updates thread status
- [ ] Updates thread priority
- [ ] Updates assigned admin
- [ ] Updates private note
- [ ] Returns updated thread object
- [ ] Returns 404 for non-existent thread
- [ ] Validates enum values

#### PATCH /api/admin/bulk/threads
- [ ] Updates multiple threads at once
- [ ] Returns success count
- [ ] Handles partial failures gracefully
- [ ] Validates thread IDs exist
- [ ] Applies updates atomically

#### DELETE /api/admin/bulk/threads
- [ ] Deletes multiple threads
- [ ] Removes associated messages
- [ ] Removes associated attachments
- [ ] Returns success count
- [ ] Handles non-existent threads gracefully

## Performance Tests
### Response Times
- [ ] GET /api/messages: <200ms (10 threads)
- [ ] GET /api/messages: <500ms (100 threads)
- [ ] POST /api/messages: <300ms
- [ ] GET thread messages: <100ms (50 messages)
- [ ] POST message: <200ms
- [ ] File upload: <2s (5MB file)
- [ ] Bulk operations: <1s (10 threads)

### Concurrent Load
- [ ] Handles 10 concurrent requests
- [ ] Handles 50 concurrent requests
- [ ] Maintains response times under load
- [ ] Database connections are managed properly
- [ ] Memory usage remains stable

## Security Tests
### Input Validation
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] File upload restrictions enforced
- [ ] Content type validation working
- [ ] Rate limiting functional (if implemented)

### Authentication & Authorization
- [ ] Admin endpoints require authentication
- [ ] Customer endpoints work without auth
- [ ] Invalid tokens are rejected
- [ ] Access control is properly enforced

## Manual Testing Scenarios

### Customer Journey
1. [ ] Customer creates new thread
2. [ ] Customer sends initial message
3. [ ] Customer uploads attachment
4. [ ] Customer views thread list
5. [ ] Customer checks for new messages
6. [ ] Customer sends follow-up message

### Admin Journey
1. [ ] Admin views all threads
2. [ ] Admin filters by status/priority
3. [ ] Admin opens thread details
4. [ ] Admin sends reply
5. [ ] Admin updates thread status
6. [ ] Admin assigns thread to self
7. [ ] Admin adds private note
8. [ ] Admin uses quick reply
9. [ ] Admin performs bulk operations

## Production Readiness
### Configuration
- [ ] Environment variables properly set
- [ ] Database connection string secure
- [ ] File upload directory configured
- [ ] CORS settings appropriate
- [ ] Rate limiting configured

### Monitoring
- [ ] Error logging functional
- [ ] Performance monitoring enabled
- [ ] Health check endpoint working
- [ ] Database monitoring active
- [ ] Alert thresholds set

### Documentation
- [ ] API documentation complete
- [ ] Postman collection documented
- [ ] Error codes documented
- [ ] Rate limits documented
- [ ] File upload limits documented

## Sign-off Checklist
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Performance benchmarks met
- [ ] Security tests completed
- [ ] Manual testing scenarios completed
- [ ] Postman collection fully validated
- [ ] Production configuration verified
- [ ] Monitoring and alerting configured
- [ ] Documentation complete and accurate
- [ ] Stakeholder approval obtained

---

## Notes
- Record any issues found during testing
- Document workarounds for known limitations
- Update checklist based on findings
- Maintain test data sets for regression testing
- Schedule regular re-testing cycles