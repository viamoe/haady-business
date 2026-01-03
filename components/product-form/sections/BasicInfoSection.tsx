'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'

export function BasicInfoSection() {
  const { formData, updateField, errors, clearError } = useProductFormContext()

  return (
    <div className="space-y-6">
      {/* Product Name - English */}
      <div className="space-y-2">
        <Label 
          htmlFor="name_en" 
          className={cn("flex items-center gap-2", errors.nameEn ? 'text-red-600' : '')}
        >
          Product Name (English){' '}
          {!formData.nameEn && (
            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              required
            </span>
          )}
        </Label>
        <Input
          id="name_en"
          value={formData.nameEn}
          onChange={(e) => {
            updateField('nameEn', e.target.value)
            if (errors.nameEn) clearError('nameEn')
          }}
          placeholder="Enter product name in English"
          dir="ltr"
          className={errors.nameEn ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {errors.nameEn && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.nameEn}
          </p>
        )}
      </div>

      {/* Product Name - Arabic */}
      <div className="space-y-2">
        <Label 
          htmlFor="name_ar" 
          className={cn("flex items-center gap-2", errors.nameAr ? 'text-red-600' : '')}
        >
          Product Name (Arabic){' '}
          {!formData.nameAr && (
            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              required
            </span>
          )}
        </Label>
        <Input
          id="name_ar"
          value={formData.nameAr}
          onChange={(e) => {
            updateField('nameAr', e.target.value)
            if (errors.nameAr) clearError('nameAr')
          }}
          placeholder="أدخل اسم المنتج بالعربية"
          dir="rtl"
          className={errors.nameAr ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {errors.nameAr && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.nameAr}
          </p>
        )}
      </div>

      {/* Description - English */}
      <div className="space-y-2">
        <Label htmlFor="description_en">Description (English)</Label>
        <RichTextEditor
          value={formData.descriptionEn}
          onChange={(value) => updateField('descriptionEn', value)}
          placeholder="Enter product description in English"
          dir="ltr"
          minHeight="120px"
        />
      </div>

      {/* Description - Arabic */}
      <div className="space-y-2">
        <Label htmlFor="description_ar">Description (Arabic)</Label>
        <RichTextEditor
          value={formData.descriptionAr}
          onChange={(value) => updateField('descriptionAr', value)}
          placeholder="أدخل وصف المنتج بالعربية"
          dir="rtl"
          minHeight="120px"
        />
      </div>
    </div>
  )
}

