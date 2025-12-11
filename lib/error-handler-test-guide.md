# Error Handler Testing Guide

## Quick Access

Navigate to: **`http://localhost:3002/test-errors`**

## Testing Methods

### Method 1: Using the Test Page (Recommended)

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**
   - Go to: `http://localhost:3002/test-errors`
   - You'll see a page with multiple test buttons

3. **Test each error type**:
   - Click each button to trigger different error scenarios
   - Watch for toast notifications
   - Check the browser console for detailed logs
   - Review the test results panel

### Method 2: Test in Real Scenarios

#### Test Network Errors
1. **Disconnect your internet** (or use browser DevTools)
2. **Try to sync a store** in the dashboard
3. **Expected**: Toast showing "Network connection failed"

#### Test API Errors
1. **Go to dashboard** with a connected store
2. **Click "Sync"** on a store connection
3. **If it fails**: Should show appropriate error message

#### Test 404 Errors
1. **Navigate to a non-existent page**: `/dashboard/non-existent`
2. **Or trigger a fetch to invalid endpoint**

### Method 3: Browser DevTools Testing

1. **Open Browser Console** (F12 or Cmd+Option+I)
2. **Test in Console**:
   ```javascript
   // Import and test
   import { handleError } from '@/lib/error-handler'
   
   // Test network error
   handleError(new Error('Failed to fetch'), {
     context: 'Test',
     showToast: true
   })
   
   // Test API error
   handleError({ status: 404, error: 'Not found' }, {
     context: 'API Test',
     showToast: true
   })
   ```

## What to Look For

### ✅ Success Indicators

1. **Toast Notifications**:
   - Network errors: "Network connection failed. Please check your internet connection and try again."
   - 404 errors: "The requested resource was not found."
   - Auth errors: "Authentication failed. Please sign in again."
   - Permission errors: "You don't have permission to perform this action."
   - Server errors: "Server error occurred. Please try again later or contact support."

2. **Console Logs**:
   - Error type detection
   - Original error details
   - Context information
   - Stack traces (in development)

3. **Error Details Object**:
   - `type`: ErrorType enum value
   - `message`: User-friendly message
   - `statusCode`: HTTP status (if applicable)
   - `retryable`: Boolean indicating if error can be retried

### ❌ Things to Check

1. **Toast not showing?**
   - Check if `showToast: false` was set
   - Verify Toaster component is in layout
   - Check browser console for errors

2. **Wrong error type detected?**
   - Check error object structure
   - Verify error message format
   - Review `detectErrorType` function logic

3. **Error not caught?**
   - Ensure try-catch blocks are in place
   - Use `safeFetch` for all fetch calls
   - Wrap async functions with `withErrorHandling`

## Test Scenarios Checklist

- [ ] Network error (disconnect internet)
- [ ] 404 Not Found error
- [ ] 500 Server error
- [ ] 401 Authentication error
- [ ] 403 Permission error
- [ ] Validation error
- [ ] Unknown error
- [ ] Silent error (no toast)
- [ ] Supabase error (PGRST116, 42501, etc.)
- [ ] Error with custom context
- [ ] Error with fallback message

## Integration Testing

Test the error handler in real components:

1. **Dashboard Store Sync**:
   - Go to dashboard
   - Click "Sync" on a store
   - If it fails, verify error is handled properly

2. **Store Disconnect**:
   - Try to disconnect a store
   - Verify error handling if it fails

3. **Auto-fetch Store Info**:
   - Check console for silent errors
   - Should not show toast for network errors

## Debugging Tips

1. **Enable verbose logging**:
   ```typescript
   handleError(error, {
     context: 'Operation',
     logError: true, // Always log
     showToast: true
   })
   ```

2. **Check error structure**:
   ```typescript
   console.log('Error details:', {
     type: error.type,
     message: error.message,
     statusCode: error.statusCode,
     retryable: error.retryable,
     originalError: error.originalError
   })
   ```

3. **Test error detection**:
   ```typescript
   import { ErrorType, detectErrorType } from '@/lib/error-handler'
   
   const errorType = detectErrorType(yourError)
   console.log('Detected type:', errorType)
   ```

