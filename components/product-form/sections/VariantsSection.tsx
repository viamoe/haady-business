'use client'

import { useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Layers, 
  Plus, 
  X, 
  ChevronDown,
  Palette,
  Ruler,
  Box,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'
import { VariantOption, ProductVariant } from '../types'

// Predefined option types with common values
const PRESET_OPTIONS = {
  Color: ['Red', 'Blue', 'Green', 'Black', 'White', 'Gray', 'Navy', 'Pink', 'Yellow', 'Orange', 'Purple', 'Brown'],
  Size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  Material: ['Cotton', 'Polyester', 'Silk', 'Wool', 'Linen', 'Leather', 'Denim'],
  Style: ['Regular', 'Slim', 'Relaxed', 'Classic', 'Modern'],
}

export function VariantsSection() {
  const { formData, updateField, currencyIcon } = useProductFormContext()
  const [isOpen, setIsOpen] = useState(false)
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionValues, setNewOptionValues] = useState<string>('')
  const [showAddOption, setShowAddOption] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  // Generate all possible variant combinations
  const generateVariants = useCallback((options: VariantOption[]): ProductVariant[] => {
    if (options.length === 0) return []

    const combinations: Record<string, string>[] = [{}]
    
    for (const option of options) {
      const newCombinations: Record<string, string>[] = []
      for (const combo of combinations) {
        for (const value of option.values) {
          newCombinations.push({ ...combo, [option.name]: value })
        }
      }
      combinations.length = 0
      combinations.push(...newCombinations)
    }

    return combinations.map((combo, index) => ({
      id: `variant-${index}`,
      options: combo,
      price: formData.price || '',
      sku: '',
      stock: '',
      enabled: true,
    }))
  }, [formData.price])

  // Add a new option
  const addOption = useCallback((name: string, values: string[]) => {
    if (!name.trim() || values.length === 0) return

    const newOption: VariantOption = {
      id: `option-${Date.now()}`,
      name: name.trim(),
      values: values.filter(v => v.trim()),
    }

    const newOptions = [...formData.variantOptions, newOption]
    updateField('variantOptions', newOptions)
    updateField('variants', generateVariants(newOptions))
    
    setNewOptionName('')
    setNewOptionValues('')
    setShowAddOption(false)
    setSelectedPreset('')
  }, [formData.variantOptions, updateField, generateVariants])

  // Add preset option
  const addPresetOption = useCallback((presetName: string) => {
    const values = PRESET_OPTIONS[presetName as keyof typeof PRESET_OPTIONS]
    if (values) {
      addOption(presetName, values)
    }
  }, [addOption])

  // Remove an option
  const removeOption = useCallback((optionId: string) => {
    const newOptions = formData.variantOptions.filter(o => o.id !== optionId)
    updateField('variantOptions', newOptions)
    updateField('variants', generateVariants(newOptions))
  }, [formData.variantOptions, updateField, generateVariants])

  // Add value to existing option
  const addValueToOption = useCallback((optionId: string, value: string) => {
    if (!value.trim()) return

    const newOptions = formData.variantOptions.map(opt => {
      if (opt.id === optionId && !opt.values.includes(value.trim())) {
        return { ...opt, values: [...opt.values, value.trim()] }
      }
      return opt
    })
    
    updateField('variantOptions', newOptions)
    updateField('variants', generateVariants(newOptions))
  }, [formData.variantOptions, updateField, generateVariants])

  // Remove value from option
  const removeValueFromOption = useCallback((optionId: string, value: string) => {
    const newOptions = formData.variantOptions.map(opt => {
      if (opt.id === optionId) {
        const newValues = opt.values.filter(v => v !== value)
        return { ...opt, values: newValues }
      }
      return opt
    }).filter(opt => opt.values.length > 0) // Remove options with no values
    
    updateField('variantOptions', newOptions)
    updateField('variants', generateVariants(newOptions))
  }, [formData.variantOptions, updateField, generateVariants])

  // Update variant field
  const updateVariant = useCallback((variantId: string, field: keyof ProductVariant, value: any) => {
    updateField(
      'variants',
      formData.variants.map(v => v.id === variantId ? { ...v, [field]: value } : v)
    )
  }, [formData.variants, updateField])

  // Get option icon
  const getOptionIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('color') || lowerName.includes('colour')) return <Palette className="h-4 w-4" />
    if (lowerName.includes('size')) return <Ruler className="h-4 w-4" />
    return <Box className="h-4 w-4" />
  }

  // Available presets (not already added)
  const availablePresets = useMemo(() => {
    const usedNames = formData.variantOptions.map(o => o.name.toLowerCase())
    return Object.keys(PRESET_OPTIONS).filter(
      preset => !usedNames.includes(preset.toLowerCase())
    )
  }, [formData.variantOptions])

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Layers className="h-5 w-5 text-[#F4610B]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Variants</h3>
            <p className="text-sm text-gray-500">
              {formData.hasVariants 
                ? `${formData.variants.length} variant${formData.variants.length !== 1 ? 's' : ''}`
                : 'Add size, color, or other options'}
            </p>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="space-y-6 pl-4 border-l-2 border-gray-100">
          {/* Enable Variants Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-900">Enable Variants</Label>
              <p className="text-xs text-gray-500">Add options like size, color, material</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newValue = !formData.hasVariants
                updateField('hasVariants', newValue)
                if (!newValue) {
                  updateField('variantOptions', [])
                  updateField('variants', [])
                }
              }}
              className={cn(
                "h-6 w-11 rounded-full transition-all relative",
                formData.hasVariants ? "bg-[#F4610B]" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                formData.hasVariants ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>

          {formData.hasVariants && (
            <>
              {/* Existing Options */}
              {formData.variantOptions.map((option) => (
                <div key={option.id} className="space-y-3 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getOptionIcon(option.name)}
                      <span className="font-medium text-gray-900">{option.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(option.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value) => (
                      <Badge
                        key={value}
                        variant="secondary"
                        className="pl-3 pr-1 py-1 flex items-center gap-1"
                      >
                        {value}
                        <button
                          type="button"
                          onClick={() => removeValueFromOption(option.id, value)}
                          className="h-4 w-4 rounded-full hover:bg-gray-300 flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <AddValueInput
                      onAdd={(value) => addValueToOption(option.id, value)}
                    />
                  </div>
                </div>
              ))}

              {/* Add Option Section */}
              {showAddOption ? (
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="space-y-2">
                    <Label>Option Name</Label>
                    <Input
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      placeholder="e.g., Size, Color, Material"
                      autoFocus
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Values (comma-separated)</Label>
                    <Input
                      value={newOptionValues}
                      onChange={(e) => setNewOptionValues(e.target.value)}
                      placeholder="e.g., Small, Medium, Large"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        const values = newOptionValues.split(',').map(v => v.trim()).filter(Boolean)
                        addOption(newOptionName, values)
                      }}
                      disabled={!newOptionName.trim() || !newOptionValues.trim()}
                      className="bg-[#F4610B] hover:bg-[#E5550A]"
                    >
                      Add Option
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddOption(false)
                        setNewOptionName('')
                        setNewOptionValues('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Quick Add Presets */}
                  {availablePresets.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {availablePresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => addPresetOption(preset)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-[#F4610B] hover:text-[#F4610B] transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddOption(true)}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Option
                  </Button>
                </div>
              )}

              {/* Variants Table */}
              {formData.variants.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm text-gray-600">
                    Variant Details ({formData.variants.length} variants)
                  </Label>
                  
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">Variant</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">Stock</th>
                            <th className="text-center px-4 py-3 font-medium text-gray-600">Enabled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {formData.variants.map((variant) => (
                            <tr key={variant.id} className={cn(!variant.enabled && "opacity-50")}>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(variant.options).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="text-xs">
                                      {value}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                    {currencyIcon || '$'}
                                  </span>
                                  <Input
                                    type="number"
                                    value={variant.price}
                                    onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                                    className="h-8 text-xs pl-6"
                                    placeholder="0.00"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={variant.sku}
                                  onChange={(e) => updateVariant(variant.id, 'sku', e.target.value.toUpperCase())}
                                  className="h-8 text-xs w-28 uppercase"
                                  placeholder="SKU"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                                  className="h-8 text-xs w-20"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => updateVariant(variant.id, 'enabled', !variant.enabled)}
                                  className={cn(
                                    "h-5 w-9 rounded-full transition-all relative",
                                    variant.enabled ? "bg-green-500" : "bg-gray-300"
                                  )}
                                >
                                  <div className={cn(
                                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                                    variant.enabled ? "left-4" : "left-0.5"
                                  )} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Helper component for adding values inline
function AddValueInput({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="h-6 px-2 text-xs text-gray-500 hover:text-[#F4610B] border border-dashed border-gray-300 rounded-md hover:border-[#F4610B] transition-colors"
      >
        + Add
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            e.preventDefault()
            onAdd(value.trim())
            setValue('')
            setIsEditing(false)
          } else if (e.key === 'Escape') {
            setValue('')
            setIsEditing(false)
          }
        }}
        onBlur={() => {
          if (value.trim()) {
            onAdd(value.trim())
          }
          setValue('')
          setIsEditing(false)
        }}
        className="h-6 w-24 text-xs"
        placeholder="Value"
        autoFocus
      />
    </div>
  )
}

