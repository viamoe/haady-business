import { LucideIcon, DollarSign, Tag, Image, FileText, Package, Hash, Settings } from 'lucide-react'
import type { Category, Brand } from '../types'

/**
 * Format category IDs to category names
 */
export function formatCategoryValue(
  value: any,
  categories: Category[]
): string {
  if (value === null || value === undefined) {
    return 'empty'
  }
  
  if (value === '' || (Array.isArray(value) && value.length === 0)) {
    return 'empty'
  }

  // Handle array of category IDs
  if (Array.isArray(value)) {
    const categoryNames = value
      .map((id: string) => categories.find(cat => cat.id === id)?.name)
      .filter(Boolean) as string[]
    return categoryNames.length > 0 ? categoryNames.join(', ') : 'empty'
  }

  // Handle comma-separated string of IDs
  if (typeof value === 'string' && value.includes(',')) {
    const ids = value.split(',').map(id => id.trim()).filter(Boolean)
    const categoryNames = ids
      .map((id: string) => categories.find(cat => cat.id === id)?.name)
      .filter(Boolean) as string[]
    return categoryNames.length > 0 ? categoryNames.join(', ') : 'empty'
  }

  // Handle single category ID (string)
  const category = categories.find(cat => cat.id === value)
  return category ? category.name : String(value)
}

/**
 * Format brand ID to brand name
 */
export function formatBrandValue(
  value: any,
  brands: Brand[]
): string {
  if (value === null || value === undefined || value === '') {
    return 'empty'
  }
  
  const brand = brands.find(b => b.id === value)
  return brand ? brand.name : 'empty'
}

/**
 * Format image value for display
 */
export function formatImageValue(value: any): string {
  if (value === null || value === undefined) {
    return 'empty'
  }
  
  // Handle array of image URLs
  if (Array.isArray(value)) {
    if (value.length === 0) return 'empty'
    return `${value.length} image${value.length > 1 ? 's' : ''}`
  }
  
  // Handle single image URL - just show "1 image"
  if (typeof value === 'string' && value.startsWith('http')) {
    return '1 image'
  }
  
  return String(value)
}

/**
 * Format field value for display
 */
export function formatFieldValue(
  field: string,
  value: any,
  categories: Category[],
  brands: Brand[]
): string {
  // Special handling for category_ids
  if (field === 'category_ids' || field.includes('category')) {
    return formatCategoryValue(value, categories)
  }

  // Special handling for brand_id
  if (field === 'brand_id' || field.includes('brand')) {
    return formatBrandValue(value, brands)
  }

  // Special handling for images
  if (field === 'images_added' || field === 'images_removed' || field.includes('image')) {
    return formatImageValue(value)
  }

  // Handle empty values
  if (value === null || value === undefined) {
    return 'empty'
  }
  
  if (value === '' || (Array.isArray(value) && value.length === 0)) {
    return 'empty'
  }

  // Truncate long strings
  const str = String(value)
  return str.length > 30 ? str.substring(0, 30) + '...' : str
}

/**
 * Get appropriate icon for a field name
 */
export function getFieldIcon(fieldName: string): LucideIcon {
  const field = fieldName.toLowerCase()
  
  if (field.includes('price') || field.includes('cost')) return DollarSign
  if (field.includes('name') || field.includes('title')) return Tag
  if (field.includes('image') || field.includes('photo')) return Image
  if (field.includes('description')) return FileText
  if (field.includes('category')) return Package
  if (field.includes('brand')) return Tag
  if (field.includes('sku') || field.includes('barcode')) return Hash
  if (field.includes('inventory') || field.includes('stock')) return Package
  if (field.includes('status') || field.includes('active')) return Settings
  
  return Settings // Default icon
}

/**
 * Format field name for display (snake_case to Title Case)
 */
export function formatFieldName(field: string): string {
  // Special field name mappings
  const fieldMappings: Record<string, string> = {
    'images_added': 'Images Added',
    'images_removed': 'Image Removed',
    'brand_id': 'Brand',
    'category_ids': 'Categories',
    'name_en': 'Name (English)',
    'name_ar': 'Name (Arabic)',
    'description_en': 'Description (English)',
    'description_ar': 'Description (Arabic)',
    'compare_at_price': 'Compare At Price',
    'is_available': 'Available',
    'is_active': 'Active',
  }
  
  if (fieldMappings[field]) {
    return fieldMappings[field]
  }
  
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Get user initials from name
 */
export function getUserInitials(name: string | undefined): string {
  if (!name) return 'U'
  
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format date for history display
 */
export function formatHistoryDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format date and time for history display
 */
export function formatHistoryDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format edit type for display
 */
export function formatEditType(editType: string): string {
  switch (editType) {
    case 'draft_save':
      return 'Draft Save'
    case 'update':
      return 'Update'
    case 'publish':
      return 'Published'
    case 'image_upload':
      return 'Images Added'
    case 'image_delete':
      return 'Image Removed'
    default:
      return editType.charAt(0).toUpperCase() + editType.slice(1)
  }
}

