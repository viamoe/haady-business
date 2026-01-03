# Testing Guide for Products Content

## Overview

This guide explains how to test the refactored products content code following best practices.

## Test Structure

```
app/dashboard/products/hooks/__tests__/
├── use-product-fetch.test.ts       - Tests for data fetching hook
├── use-product-state.test.ts        - Tests for state management hook
├── use-product-dialogs.test.ts     - Tests for dialog management hook
├── use-product-operations.test.ts   - Tests for operations hook
└── integration.test.ts              - Integration tests for hooks working together
```

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests in watch mode
```bash
pnpm test --watch
```

### Run tests with UI
```bash
pnpm test:ui
```

### Run tests with coverage
```bash
pnpm test:coverage
```

## Test Categories

### 1. Unit Tests

Each hook is tested independently to verify:
- ✅ Initial state
- ✅ State updates
- ✅ Computed values (memoization)
- ✅ Error handling
- ✅ Edge cases

**Example:**
```typescript
// use-product-state.test.ts
it('should filter products by search value', () => {
  const { result } = renderHook(() => useProductState([mockProduct]))
  
  act(() => {
    result.current.setSearchValue('Test')
  })
  
  expect(result.current.filteredProducts).toHaveLength(1)
})
```

### 2. Integration Tests

Tests verify hooks work together correctly:
- ✅ Data flow between hooks
- ✅ No side effects between hooks
- ✅ Reusability (multiple instances)

**Example:**
```typescript
// integration.test.ts
it('should work together for a complete product management flow', async () => {
  const fetchHook = renderHook(() => useProductFetch())
  const stateHook = renderHook(() => useProductState())
  
  // Fetch and update state
  const products = await fetchHook.result.current.fetchProducts({ storeId: 'store-1' })
  act(() => stateHook.result.current.setAllProducts(products))
  
  expect(stateHook.result.current.allProducts).toHaveLength(1)
})
```

## Testing Best Practices

### ✅ What We're Testing

1. **State Management**
   - Initial values
   - State updates
   - Computed values (memoization)

2. **Data Fetching**
   - Successful fetches
   - Error handling
   - Retry logic
   - Loading states

3. **Business Logic**
   - Filtering logic
   - Status calculations
   - Search functionality

4. **Hook Interactions**
   - Independence (separation of concerns)
   - Reusability
   - No side effects

### ✅ Test Coverage Goals

- **Unit Tests**: 80%+ coverage for each hook
- **Integration Tests**: All critical flows
- **Edge Cases**: Error scenarios, empty states

## Writing New Tests

### Template for Hook Tests

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useYourHook } from '../use-your-hook'

describe('useYourHook', () => {
  describe('feature name', () => {
    it('should do something', () => {
      const { result } = renderHook(() => useYourHook())
      
      // Test initial state
      expect(result.current.someValue).toBe(expected)
      
      // Test state update
      act(() => {
        result.current.updateValue(newValue)
      })
      
      // Assert result
      expect(result.current.someValue).toBe(newValue)
    })
  })
})
```

## Mocking

### Supabase Client

```typescript
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))
```

### API Responses

```typescript
vi.mocked(supabase.from).mockImplementation((table: string) => {
  if (table === 'products') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // ... chain methods
      limit: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
        count: 1,
      }),
    } as any
  }
})
```

## Test Scenarios

### ✅ Happy Paths
- Successful data fetching
- Correct filtering
- Proper state updates

### ✅ Error Handling
- Network errors
- Database errors
- Invalid data

### ✅ Edge Cases
- Empty states
- Null/undefined values
- Large datasets
- Concurrent operations

## Continuous Integration

Tests should run:
- ✅ On every commit (pre-commit hook)
- ✅ On pull requests
- ✅ Before deployment

## Benefits of This Testing Approach

1. **Fast**: Unit tests run quickly
2. **Isolated**: Each hook tested independently
3. **Maintainable**: Easy to update when hooks change
4. **Reliable**: Catch bugs before production
5. **Documentation**: Tests serve as usage examples

## Next Steps

1. **Add E2E Tests**: Test full user flows with Playwright/Cypress
2. **Performance Tests**: Test with large datasets
3. **Accessibility Tests**: Ensure hooks work with screen readers
4. **Visual Regression**: Test UI components

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

