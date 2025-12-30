import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductFormProvider } from '../context'
import { BasicInfoSection } from '../sections/BasicInfoSection'
import { ClassificationSection } from '../sections/ClassificationSection'
import { InventorySection } from '../sections/InventorySection'

// Mock the required modules
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}))

vi.mock('@/lib/store-connection-context', () => ({
  useStoreConnection: () => ({
    selectedConnectionId: null,
    selectedConnection: null,
    storeId: 'test-store-id',
  }),
}))

vi.mock('@/i18n/context', () => ({
  useLocale: () => ({
    locale: 'en',
    isRTL: false,
  }),
}))

// Wrapper component for tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ProductFormProvider product={null}>
      {children}
    </ProductFormProvider>
  )
}

describe('BasicInfoSection', () => {
  it('renders product name inputs', () => {
    render(
      <TestWrapper>
        <BasicInfoSection />
      </TestWrapper>
    )

    expect(screen.getByLabelText(/Product Name \(English\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Product Name \(Arabic\)/i)).toBeInTheDocument()
  })

  it('renders description textareas', () => {
    render(
      <TestWrapper>
        <BasicInfoSection />
      </TestWrapper>
    )

    expect(screen.getByLabelText(/Description \(English\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description \(Arabic\)/i)).toBeInTheDocument()
  })

  it('shows required indicator for name fields', () => {
    render(
      <TestWrapper>
        <BasicInfoSection />
      </TestWrapper>
    )

    const requiredBadges = screen.getAllByText('required')
    expect(requiredBadges).toHaveLength(2) // English and Arabic name
  })

  it('updates form data when typing in name field', async () => {
    render(
      <TestWrapper>
        <BasicInfoSection />
      </TestWrapper>
    )

    const nameInput = screen.getByPlaceholderText('Enter product name in English')
    fireEvent.change(nameInput, { target: { value: 'Test Product' } })
    
    expect(nameInput).toHaveValue('Test Product')
  })
})

describe('ClassificationSection', () => {
  it('renders product type options', () => {
    render(
      <TestWrapper>
        <ClassificationSection />
      </TestWrapper>
    )

    expect(screen.getByText('Physical')).toBeInTheDocument()
    expect(screen.getByText('Digital')).toBeInTheDocument()
    expect(screen.getByText('Service')).toBeInTheDocument()
    expect(screen.getByText('Bundle')).toBeInTheDocument()
  })

  it('renders selling method options', () => {
    render(
      <TestWrapper>
        <ClassificationSection />
      </TestWrapper>
    )

    expect(screen.getByText('Per Unit')).toBeInTheDocument()
    expect(screen.getByText('By Weight')).toBeInTheDocument()
    expect(screen.getByText('By Length')).toBeInTheDocument()
    expect(screen.getByText('By Time')).toBeInTheDocument()
    expect(screen.getByText('Subscription')).toBeInTheDocument()
  })

  it('renders sales channel options', () => {
    render(
      <TestWrapper>
        <ClassificationSection />
      </TestWrapper>
    )

    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('In-Store')).toBeInTheDocument()
  })

  it('selects product type when clicked', () => {
    render(
      <TestWrapper>
        <ClassificationSection />
      </TestWrapper>
    )

    const digitalButton = screen.getByText('Digital').closest('button')
    if (digitalButton) {
      fireEvent.click(digitalButton)
    }

    // Digital should now be selected (has ring class or similar styling)
    expect(digitalButton?.className).toContain('ring')
  })
})

describe('InventorySection', () => {
  it('renders section header', () => {
    render(
      <TestWrapper>
        <InventorySection />
      </TestWrapper>
    )

    expect(screen.getByText('Inventory')).toBeInTheDocument()
    expect(screen.getByText('Track stock and availability')).toBeInTheDocument()
  })

  it('expands when clicked', async () => {
    render(
      <TestWrapper>
        <InventorySection />
      </TestWrapper>
    )

    const header = screen.getByText('Inventory').closest('button')
    if (header) {
      fireEvent.click(header)
    }

    // Should now show inventory options
    expect(screen.getByText('Track Inventory')).toBeInTheDocument()
  })

  it('shows stock fields when tracking is enabled', async () => {
    render(
      <TestWrapper>
        <InventorySection />
      </TestWrapper>
    )

    // Expand section
    const header = screen.getByText('Inventory').closest('button')
    if (header) {
      fireEvent.click(header)
    }

    // Track inventory is enabled by default
    expect(screen.getByText('Stock Quantity')).toBeInTheDocument()
    expect(screen.getByText('Low Stock Alert Threshold')).toBeInTheDocument()
  })
})

