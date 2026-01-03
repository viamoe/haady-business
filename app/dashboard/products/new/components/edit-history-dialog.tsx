'use client'

import { memo } from 'react'
import { 
  History, 
  Loader2, 
  CheckCircle2, 
  Plus, 
  Pencil, 
  Image as ImageIcon,
  Trash2,
  Send,
  Save,
  User,
  DollarSign,
  Tag,
  FileText,
  Package,
  Hash,
  Barcode,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UserHistoryGroup, Category, Brand, EditHistoryEntry } from '../types'
import {
  formatFieldValue,
  formatFieldName,
  formatHistoryDateTime,
} from '../utils'

interface EditHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isLoading: boolean
  groupedHistory: UserHistoryGroup[]
  categories: Category[]
  brands: Brand[]
  expandedUsers: Set<string>
  onToggleUser: (userId: string) => void
}

/**
 * Get icon and colors for a specific field
 */
function getFieldIconConfig(field: string): {
  icon: LucideIcon
  bgColor: string
  iconColor: string
  borderColor: string
} {
  const fieldLower = field.toLowerCase()
  
  if (fieldLower.includes('price') || fieldLower.includes('cost') || fieldLower.includes('discount_value')) {
    return {
      icon: DollarSign,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      borderColor: 'border-emerald-200',
    }
  }
  if (fieldLower.includes('category')) {
    return {
      icon: Tag,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-500',
      borderColor: 'border-orange-200',
    }
  }
  if (fieldLower.includes('brand')) {
    return {
      icon: Tag,
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-500',
      borderColor: 'border-pink-200',
    }
  }
  if (fieldLower.includes('image') || fieldLower.includes('photo')) {
    return {
      icon: ImageIcon,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500',
      borderColor: 'border-purple-200',
    }
  }
  if (fieldLower.includes('description')) {
    return {
      icon: FileText,
      bgColor: 'bg-sky-50',
      iconColor: 'text-sky-500',
      borderColor: 'border-sky-200',
    }
  }
  if (fieldLower.includes('name')) {
    return {
      icon: FileText,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      borderColor: 'border-indigo-200',
    }
  }
  if (fieldLower.includes('sku') || fieldLower.includes('barcode')) {
    return {
      icon: Barcode,
      bgColor: 'bg-slate-100',
      iconColor: 'text-slate-600',
      borderColor: 'border-slate-300',
    }
  }
  if (fieldLower.includes('quantity') || fieldLower.includes('stock') || fieldLower.includes('inventory')) {
    return {
      icon: Package,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-500',
      borderColor: 'border-amber-200',
    }
  }
  if (fieldLower.includes('status')) {
    return {
      icon: Settings,
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-500',
      borderColor: 'border-teal-200',
    }
  }
  if (fieldLower.includes('type') || fieldLower.includes('method')) {
    return {
      icon: Settings,
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-500',
      borderColor: 'border-violet-200',
    }
  }
  if (fieldLower.includes('discount')) {
    return {
      icon: DollarSign,
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-500',
      borderColor: 'border-rose-200',
    }
  }
  
  return {
    icon: Hash,
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-500',
    borderColor: 'border-gray-200',
  }
}

/**
 * Get the primary field from changes to determine the icon
 */
function getPrimaryChangedField(changes: Record<string, any>): string | null {
  const fields = Object.keys(changes)
  if (fields.length === 0) return null
  
  // Priority order for icon selection
  const priorityFields = ['price', 'category', 'brand', 'image', 'name', 'description', 'sku', 'status', 'discount']
  
  for (const priority of priorityFields) {
    const match = fields.find(f => f.toLowerCase().includes(priority))
    if (match) return match
  }
  
  return fields[0]
}

/**
 * Get the icon and styling for each edit type
 */
function getEditTypeConfig(editType: string, changes?: Record<string, any>) {
  switch (editType) {
    case 'publish':
      return {
        icon: CheckCircle2,
        label: 'Published',
        bgColor: 'bg-green-50',
        iconColor: 'text-green-500',
        borderColor: 'border-green-200',
      }
    case 'create':
      return {
        icon: Plus,
        label: 'Created',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-500',
        borderColor: 'border-blue-200',
      }
    case 'update': {
      // For updates, use the icon and colors of the primary changed field
      const primaryField = changes ? getPrimaryChangedField(changes) : null
      if (primaryField) {
        const fieldConfig = getFieldIconConfig(primaryField)
        return {
          ...fieldConfig,
          label: 'Updated',
        }
      }
      return {
        icon: Pencil,
        label: 'Updated',
        bgColor: 'bg-gray-50',
        iconColor: 'text-gray-500',
        borderColor: 'border-gray-200',
      }
    }
    case 'draft_save': {
      // For draft saves, also use field-specific icon and colors
      const primaryField = changes ? getPrimaryChangedField(changes) : null
      if (primaryField) {
        const fieldConfig = getFieldIconConfig(primaryField)
        return {
          ...fieldConfig,
          label: 'Draft Saved',
        }
      }
      return {
        icon: Save,
        label: 'Draft Saved',
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-500',
        borderColor: 'border-amber-200',
      }
    }
    case 'image_upload':
      return {
        icon: ImageIcon,
        label: 'Images Added',
        bgColor: 'bg-purple-50',
        iconColor: 'text-purple-500',
        borderColor: 'border-purple-200',
      }
    case 'image_delete':
      return {
        icon: Trash2,
        label: 'Images Removed',
        bgColor: 'bg-red-50',
        iconColor: 'text-red-500',
        borderColor: 'border-red-200',
      }
    default:
      return {
        icon: Send,
        label: editType.charAt(0).toUpperCase() + editType.slice(1).replace(/_/g, ' '),
        bgColor: 'bg-gray-50',
        iconColor: 'text-gray-500',
        borderColor: 'border-gray-200',
      }
  }
}

/**
 * Check if a value is considered "empty"
 */
function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) return true
  if (value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

/**
 * Format changes into a readable description
 */
function formatChangesDescription(
  changes: Record<string, { old_value: any; new_value: any }>,
  categories: Category[],
  brands: Brand[]
): string[] {
  const descriptions: string[] = []
  
  for (const [field, change] of Object.entries(changes)) {
    const fieldName = formatFieldName(field)
    const oldVal = formatFieldValue(field, change.old_value, categories, brands)
    const newVal = formatFieldValue(field, change.new_value, categories, brands)
    
    const wasEmpty = isEmptyValue(change.old_value)
    const isNowEmpty = isEmptyValue(change.new_value)
    
    if (wasEmpty && !isNowEmpty) {
      // Added: empty → value
      descriptions.push(`${fieldName}: Added "${newVal}"`)
    } else if (!wasEmpty && isNowEmpty) {
      // Removed: value → empty
      descriptions.push(`${fieldName}: Removed "${oldVal}"`)
    } else {
      // Updated: value → different value
      descriptions.push(`${fieldName}: ${oldVal} → ${newVal}`)
    }
  }
  
  return descriptions
}

/**
 * Get user initials from name
 */
function getUserInitials(name: string): string {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * Timeline entry component - displays a single history entry
 */
const TimelineEntry = memo(function TimelineEntry({
  entry,
  userName,
  userInitials,
  categories,
  brands,
  isLast,
}: {
  entry: EditHistoryEntry
  userName: string
  userInitials: string
  categories: Category[]
  brands: Brand[]
  isLast: boolean
}) {
  const config = getEditTypeConfig(entry.editType, entry.changes)
  const Icon = config.icon
  
  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-[2px] bg-gray-200" />
      )}
      
      {/* Icon */}
      <div className={`relative z-10 h-8 w-8 rounded-full ${config.bgColor} border ${config.borderColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Action info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-[15px] leading-tight">
              {config.label}
            </h4>
            <div className="mt-3 space-y-3">
              {Object.entries(entry.changes).map(([field, change]) => {
                const fieldName = formatFieldName(field)
                const oldVal = formatFieldValue(field, change.old_value, categories, brands)
                const newVal = formatFieldValue(field, change.new_value, categories, brands)
                const wasEmpty = isEmptyValue(change.old_value)
                const isNowEmpty = isEmptyValue(change.new_value)
                
                return (
                  <div key={field} className="text-sm">
                    <span className="font-semibold text-gray-700">{fieldName}</span>
                    <div className="text-gray-500 mt-0.5">
                      {wasEmpty && !isNowEmpty ? (
                        <>Added <span className="text-gray-700 font-medium">"{newVal}"</span></>
                      ) : !wasEmpty && isNowEmpty ? (
                        <>Removed <span className="text-gray-400 line-through">"{oldVal}"</span></>
                      ) : (
                        <><span className="text-gray-400">{oldVal}</span> <span className="text-gray-400">→</span> <span className="text-gray-700 font-medium">{newVal}</span></>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Right side - Date and user */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-400 leading-tight">
                {formatHistoryDateTime(entry.createdAt)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                {userName}
              </p>
            </div>
            
            {/* User Avatar */}
            <div className="h-8 w-8 rounded-full bg-[#F4610B]/10 border border-[#F4610B]/30 flex items-center justify-center flex-shrink-0">
              {userInitials ? (
                <span className="text-[10px] font-bold text-[#F4610B]">{userInitials}</span>
              ) : (
                <User className="h-3.5 w-3.5 text-[#F4610B]" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

/**
 * Edit History Dialog
 * Displays the complete edit history of a product in a timeline format
 */
export const EditHistoryDialog = memo(function EditHistoryDialog({
  open,
  onOpenChange,
  isLoading,
  groupedHistory,
  categories,
  brands,
}: EditHistoryDialogProps) {
  // Flatten all entries into a single timeline, sorted by date (newest first)
  const allEntries = groupedHistory.flatMap(group => 
    group.entries.map(entry => ({
      ...entry,
      userName: group.user?.name || 'Unknown User',
      userInitials: getUserInitials(group.user?.name || ''),
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit History</DialogTitle>
          <DialogDescription>
            View all changes made to this product
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 mt-4">
          {isLoading ? (
            <LoadingState />
          ) : allEntries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="relative">
              {allEntries.map((entry, index) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  userName={entry.userName}
                  userInitials={entry.userInitials}
                  categories={categories}
                  brands={brands}
                  isLast={index === allEntries.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#F4610B]" />
        <p className="text-sm text-gray-500">Loading history...</p>
      </div>
    </div>
  )
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <History className="h-12 w-12 text-gray-300 mb-4" />
      <p className="text-gray-500 font-medium">No edit history available</p>
      <p className="text-sm text-gray-400 mt-2">
        Changes will appear here after you save edits
      </p>
    </div>
  )
}
