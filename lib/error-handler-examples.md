# Universal Error Handler - Usage Guide

## Overview

The universal error handler provides a centralized way to handle and display errors throughout the application. It automatically detects error types, provides user-friendly messages, and shows toast notifications.

## Basic Usage

### 1. Import the error handler

```typescript
import { handleError, safeFetch } from '@/lib/error-handler'
```

### 2. Using `handleError` directly

```typescript
try {
  // Your code that might throw
  await someAsyncOperation()
} catch (error) {
  handleError(error, {
    context: 'Operation name',
    showToast: true, // Default: true
    logError: true,  // Default: true
    fallbackMessage: 'Custom fallback message'
  })
}
```

### 3. Using `safeFetch` wrapper

```typescript
// Instead of:
const response = await fetch('/api/endpoint')
if (!response.ok) {
  // manual error handling...
}

// Use:
const response = await safeFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
}, {
  context: 'Create item',
  showToast: true
})

const data = await response.json()
```

### 4. Using the React Hook

```typescript
import { useErrorHandler } from '@/lib/error-handler-hook'

function MyComponent() {
  const { handleError, handleApiError, handleNetworkError } = useErrorHandler()

  const handleAction = async () => {
    try {
      const response = await fetch('/api/endpoint')
      if (!response.ok) {
        await handleApiError(response, 'Action name')
        return
      }
      // Success...
    } catch (error) {
      handleError(error, { context: 'Action name' })
    }
  }
}
```

## Error Types Detected

- **NETWORK**: Failed to fetch, network errors
- **API**: HTTP errors (400, 500, etc.)
- **AUTH**: Authentication/authorization errors (401, 403)
- **PERMISSION**: Permission denied errors
- **NOT_FOUND**: 404 errors
- **VALIDATION**: Input validation errors
- **SERVER**: Server errors (500+)
- **UNKNOWN**: All other errors

## Examples

### Example 1: API Call with Error Handling

```typescript
const fetchData = async () => {
  try {
    const response = await safeFetch('/api/data', {
      method: 'GET'
    }, {
      context: 'Fetch data'
    })
    
    return await response.json()
  } catch (error) {
    // Error is already handled and toast shown
    // You can still access error details if needed
    if (error.type === 'NETWORK') {
      // Handle network error specifically
    }
    throw error // Re-throw if needed
  }
}
```

### Example 2: Silent Error Handling (No Toast)

```typescript
try {
  await backgroundOperation()
} catch (error) {
  handleError(error, {
    context: 'Background sync',
    showToast: false, // Don't show toast
    logError: true    // But still log it
  })
}
```

### Example 3: Custom Error Message

```typescript
try {
  await operation()
} catch (error) {
  handleError(error, {
    context: 'Save settings',
    fallbackMessage: 'Unable to save your settings. Please try again.'
  })
}
```

### Example 4: Wrapping Async Functions

```typescript
import { withErrorHandling } from '@/lib/error-handler'

const saveData = withErrorHandling(
  async (data: any) => {
    const response = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Save failed')
    return response.json()
  },
  {
    context: 'Save data',
    onError: (errorDetails) => {
      // Custom error handling
      console.log('Error type:', errorDetails.type)
    }
  }
)

// Use it
try {
  await saveData(myData)
} catch (error) {
  // Error already handled
}
```

## Integration Points

The error handler is now integrated in:
- `app/dashboard/dashboard-content.tsx` - Store connection operations
- Can be used anywhere in the app

## Best Practices

1. **Always provide context**: Helps identify where the error occurred
2. **Use `safeFetch` for API calls**: Automatic error handling
3. **Silent errors for background operations**: Use `showToast: false`
4. **Log all errors**: Keep `logError: true` for debugging
5. **Handle specific error types**: Check `error.type` for custom handling

