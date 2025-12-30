'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  QrCode,
  Plus,
  Download,
  Copy,
  ExternalLink,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Calendar,
  Gift,
  TrendingUp,
  Package,
  Loader2,
  Check,
  Printer,
  Share2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  LayoutGrid,
  GripVertical,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from '@/lib/toast'

interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  sku: string | null
  price: number | null
  image_url: string | null
  // Classification fields (optional)
  product_type?: 'physical' | 'digital' | 'service' | 'bundle'
  selling_method?: 'unit' | 'weight' | 'length' | 'time' | 'subscription'
  selling_unit?: string | null
  // Sales channels
  sales_channels?: ('online' | 'in_store')[]
  // Pricing & Discounts
  compare_at_price?: number | null
  discount_type?: 'none' | 'percentage' | 'fixed_amount'
  discount_value?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
}

interface GiftCode {
  id: string
  code: string
  product_id: string
  store_id: string
  branch_id: string | null
  is_active: boolean
  expires_at: string | null
  max_uses: number | null
  current_uses: number
  custom_message: string | null
  discount_percent: number | null
  discount_amount: number | null
  qr_style: { foreground: string; background: string }
  created_at: string
  product?: Product
}

interface GiftCodeGeneratorProps {
  storeId: string
  products: Product[]
  onCodeCreated?: (code: GiftCode) => void
}

export interface GiftCodeGeneratorRef {
  refresh: () => void
  openCreateDialog: () => void
}

// QR Code SVG Generator (using simple QR encoding)
function generateQRCodeSVG(data: string, size: number = 200, foreground: string = '#F4610B', background: string = '#FFFFFF'): string {
  // For production, use a proper QR library. This is a placeholder that creates a styled box.
  // We'll use the /api/barcode endpoint we already created
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${background}"/>
      <rect x="10" y="10" width="${size - 20}" height="${size - 20}" fill="${foreground}" rx="8"/>
      <rect x="20" y="20" width="${size - 40}" height="${size - 40}" fill="${background}" rx="4"/>
      <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="middle" fill="${foreground}" font-family="Arial" font-size="12" font-weight="bold">
        QR CODE
      </text>
      <text x="${size / 2}" y="${size / 2 + 16}" text-anchor="middle" dominant-baseline="middle" fill="${foreground}" font-family="monospace" font-size="10">
        ${data.slice(-10)}
      </text>
    </svg>
  `
}

export const GiftCodeGenerator = React.forwardRef<GiftCodeGeneratorRef, GiftCodeGeneratorProps>(
  ({ storeId, products, onCodeCreated }, ref) => {
  
  // State
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewCode, setPreviewCode] = useState<GiftCode | null>(null)
  
  // Create form state
  const [formData, setFormData] = useState({
    productId: '',
    customMessage: '',
    discountPercent: '',
    discountAmount: '',
    maxUses: '',
    expiresAt: '',
    qrForeground: '#F4610B',
    qrBackground: '#FFFFFF',
  })

  // Fetch gift codes
  const fetchGiftCodes = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const { data, error } = await supabase
        .from('gift_codes')
        .select(`
          *,
          product:products(id, name_en, name_ar, sku, price, image_url)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setGiftCodes(data || [])
    } catch (error) {
      console.error('Error fetching gift codes:', error)
      toast.error('Error', { description: 'Failed to load gift codes' })
    } finally {
      if (silent) {
        setTimeout(() => setIsRefreshing(false), 300)
      } else {
        setLoading(false)
      }
    }
  }, [storeId])

  // Refresh function (silent)
  const handleRefresh = useCallback(async () => {
    await fetchGiftCodes(true)
  }, [fetchGiftCodes])

  useEffect(() => {
    fetchGiftCodes()
  }, [fetchGiftCodes])

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    refresh: handleRefresh,
    openCreateDialog: () => setShowCreateDialog(true),
  }), [handleRefresh])

  // Create gift code
  const handleCreateCode = async () => {
    if (!formData.productId) {
      toast.error('Error', { description: 'Please select a product' })
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('gift_codes')
        .insert({
          product_id: formData.productId,
          store_id: storeId,
          custom_message: formData.customMessage || null,
          discount_percent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
          discount_amount: formData.discountAmount ? parseFloat(formData.discountAmount) : null,
          max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
          expires_at: formData.expiresAt || null,
          qr_style: {
            foreground: formData.qrForeground,
            background: formData.qrBackground,
          },
        })
        .select(`
          *,
          product:products(id, name_en, name_ar, sku, price, image_url)
        `)
        .single()

      if (error) throw error

      setGiftCodes(prev => [data, ...prev])
      onCodeCreated?.(data)
      setShowCreateDialog(false)
      resetForm()
      
      toast.success('Gift Code Created! 🎁', { description: `Code ${data.code} is ready to use` })
    } catch (error) {
      console.error('Error creating gift code:', error)
      toast.error('Error', { description: 'Failed to create gift code' })
    } finally {
      setCreating(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      productId: '',
      customMessage: '',
      discountPercent: '',
      discountAmount: '',
      maxUses: '',
      expiresAt: '',
      qrForeground: '#F4610B',
      qrBackground: '#FFFFFF',
    })
  }

  // Toggle code active status
  const toggleCodeStatus = async (code: GiftCode) => {
    try {
      const { error } = await supabase
        .from('gift_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id)

      if (error) throw error

      setGiftCodes(prev =>
        prev.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c)
      )

      toast.success(code.is_active ? 'Code Deactivated' : 'Code Activated', { 
        description: `${code.code} is now ${code.is_active ? 'inactive' : 'active'}` 
      })
    } catch (error) {
      console.error('Error toggling code status:', error)
      toast.error('Error', { description: 'Failed to update code status' })
    }
  }

  // Delete code
  const deleteCode = async (code: GiftCode) => {
    if (!confirm(`Delete gift code ${code.code}? This action cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('gift_codes')
        .delete()
        .eq('id', code.id)

      if (error) throw error

      setGiftCodes(prev => prev.filter(c => c.id !== code.id))

      toast.success('Code Deleted', { description: `${code.code} has been deleted` })
    } catch (error) {
      console.error('Error deleting code:', error)
      toast.error('Error', { description: 'Failed to delete code' })
    }
  }

  // Copy link to clipboard
  const copyLink = async (code: string) => {
    const link = `https://haady.app/g/${code}`
    await navigator.clipboard.writeText(link)
    toast.success('Link Copied! 📋', { description: link })
  }

  // Download QR code
  const downloadQR = (code: GiftCode) => {
    const svg = generateQRCodeSVG(
      `https://haady.app/g/${code.code}`,
      300,
      code.qr_style?.foreground || '#F4610B',
      code.qr_style?.background || '#FFFFFF'
    )
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `haady-gift-${code.code}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter codes
  const filteredCodes = giftCodes.filter(code => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      code.code.toLowerCase().includes(search) ||
      code.product?.name_en?.toLowerCase().includes(search) ||
      code.product?.sku?.toLowerCase().includes(search)
    )
  })

  // Get product name
  const getProductName = (product?: Product) => {
    if (!product) return 'Unknown Product'
    return product.name_en || product.name_ar || 'Unnamed Product'
  }

  return (
    <div className="space-y-6">
      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#F4610B]" />
                  Create Gift Code
                </DialogTitle>
                <DialogDescription>
                  Generate a QR code that customers can scan to send this product as a gift
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Product Selection */}
                <div className="space-y-2">
                  <Label>Select Product *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => setFormData({ ...formData, productId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            {product.image_url && (
                              <div className="relative h-8 w-8 rounded overflow-hidden bg-gray-100">
                                <Image
                                  src={product.image_url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{getProductName(product)}</p>
                              <p className="text-xs text-gray-500">
                                {product.price ? `SAR ${product.price}` : 'No price'}
                                {product.sku && ` • ${product.sku}`}
                              </p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Message */}
                <div className="space-y-2">
                  <Label>Default Gift Message (Optional)</Label>
                  <Textarea
                    placeholder="A special gift for you! 🎁"
                    value={formData.customMessage}
                    onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                    className="resize-none"
                    rows={2}
                  />
                </div>

                {/* Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount % (Optional)</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      min="0"
                      max="100"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Or Fixed Amount (SAR)</Label>
                    <Input
                      type="number"
                      placeholder="50"
                      min="0"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Uses (Optional)</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      min="1"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires On (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                  </div>
                </div>

                {/* QR Style */}
                <div className="space-y-2">
                  <Label>QR Code Colors</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-500">Code</Label>
                      <Input
                        type="color"
                        value={formData.qrForeground}
                        onChange={(e) => setFormData({ ...formData, qrForeground: e.target.value })}
                        className="w-10 h-10 p-1 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-500">Background</Label>
                      <Input
                        type="color"
                        value={formData.qrBackground}
                        onChange={(e) => setFormData({ ...formData, qrBackground: e.target.value })}
                        className="w-10 h-10 p-1 cursor-pointer"
                      />
                    </div>
                    
                    {/* Preview */}
                    <div 
                      className="ml-auto w-16 h-16 rounded-lg border-2 flex items-center justify-center"
                      style={{ 
                        backgroundColor: formData.qrBackground,
                        borderColor: formData.qrForeground 
                      }}
                    >
                      <QrCode 
                        className="w-10 h-10" 
                        style={{ color: formData.qrForeground }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCode}
                  disabled={creating || !formData.productId}
                  className="bg-[#F4610B] hover:bg-[#d54e09]"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate Code
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search codes or products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Animated View Toggle */}
          <div className="flex items-center rounded-lg bg-gray-100 p-0.5 relative">
            <div 
              className={cn(
                "absolute h-8 w-[calc(50%-1px)] bg-[#F4610B] rounded-md",
                viewMode === 'grid' ? "left-0.5" : "left-[calc(50%+1px)]"
              )}
              style={{
                transition: "left 650ms linear(0, 0.1162, 0.3622, 0.6245, 0.8404, 0.9868, 1.0661, 1.0937, 1.0885, 1.0672, 1.042, 1.02, 1.0043, 0.9952, 0.9914, 0.9913, 0.993, 0.9954, 0.9976, 0.9993, 1.0003, 1)"
              }}
            />
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "h-8 px-3 rounded-md transition-all duration-200 ease-out z-10 hover:bg-transparent",
                      viewMode === 'grid' 
                        ? "text-white pointer-events-none" 
                        : "text-gray-500"
                    )}
                  >
                    <LayoutGrid className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      viewMode === 'grid' && "scale-110"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                  Grid view
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "h-8 px-3 rounded-md transition-all duration-200 ease-out z-10 hover:bg-transparent",
                      viewMode === 'list' 
                        ? "text-white pointer-events-none" 
                        : "text-gray-500"
                    )}
                  >
                    <List className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      viewMode === 'list' && "scale-110"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                  List view
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Create Gift Code Button */}
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Code
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {/* Refreshing overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Refreshing...</span>
            </div>
          </div>
        )}
        
        {loading ? (
        /* Grid Skeleton for Gift Codes */
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="overflow-hidden shadow-none">
              {/* Card Header */}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </CardHeader>
              
              {/* QR Code Preview */}
              <CardContent className="pt-0">
                <Skeleton className="aspect-square rounded-xl mb-4 w-full" />
                
                {/* Product Info */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
              
              {/* Footer Stats */}
              <CardFooter className="pt-0 border-t">
                <div className="flex items-center justify-between w-full pt-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredCodes.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-20 w-20 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <QrCode className="h-10 w-10 text-[#F4610B]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No Gift Codes Yet
            </h3>
            <p className="text-sm text-gray-400 text-center max-w-md mb-4">
              Create your first gift code to enable in-store scan-to-gift for your products
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#F4610B] hover:bg-[#d54e09]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Code
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filteredCodes.map((code) => (
            <div 
              key={code.id} 
              className={cn(
                "group relative bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 transition-all duration-300 cursor-pointer hover:-translate-y-1",
                !code.is_active && "opacity-60"
              )}
            >
              {/* QR Code Container */}
              <div 
                className="aspect-square p-4 relative overflow-hidden"
                style={{ backgroundColor: code.qr_style?.background || '#FFF8F5' }}
              >
                {/* Badges - Top Left */}
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <Badge 
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      code.is_active 
                        ? "bg-green-500 text-white hover:bg-green-500" 
                        : "bg-gray-400 text-white hover:bg-gray-400"
                    )}
                  >
                    {code.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {code.discount_percent && (
                    <Badge className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F4610B] text-white hover:bg-[#F4610B]">
                      {code.discount_percent}% off
                    </Badge>
                  )}
                </div>

                {/* Actions Menu - Top Right */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-0 shadow-lg">
                      <DropdownMenuItem 
                        onClick={() => { setPreviewCode(code); setShowPreviewDialog(true); }}
                        className="rounded-lg hover:bg-[#F4610B] hover:text-white focus:bg-[#F4610B] focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => copyLink(code.code)}
                        className="rounded-lg hover:bg-[#F4610B] hover:text-white focus:bg-[#F4610B] focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => downloadQR(code)}
                        className="rounded-lg hover:bg-[#F4610B] hover:text-white focus:bg-[#F4610B] focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download QR
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => toggleCodeStatus(code)}
                        className="rounded-lg hover:bg-[#F4610B] hover:text-white focus:bg-[#F4610B] focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                      >
                        {code.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteCode(code)}
                        className="rounded-lg text-red-600 hover:bg-red-500 hover:text-white focus:bg-red-500 focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* QR Code */}
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center group-hover:scale-105 transition-transform duration-500 ease-out">
                    <QrCode 
                      className="h-28 w-28 mx-auto mb-2"
                      style={{ color: code.qr_style?.foreground || '#F4610B' }}
                    />
                    <p 
                      className="font-mono text-sm font-bold tracking-wide"
                      style={{ color: code.qr_style?.foreground || '#F4610B' }}
                    >
                      {code.code}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Product Info */}
              <div className="p-4 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  {code.product?.image_url ? (
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      <Image
                        src={code.product.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-[#F4610B] transition-colors">
                      {getProductName(code.product)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {code.product?.price ? `SAR ${code.product.price}` : 'No price'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Stats Footer */}
              <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <TrendingUp className="h-3.5 w-3.5 text-[#F4610B]" />
                    {code.current_uses} scans
                  </span>
                  {code.max_uses && (
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                      Max: {code.max_uses}
                    </span>
                  )}
                  {code.expires_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(code.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-md flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12 rounded-tl-lg">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab hover:text-gray-400" />
                      Code
                    </div>
                  </TableHead>
                  <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab hover:text-gray-400" />
                      Product
                    </div>
                  </TableHead>
                  <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab hover:text-gray-400" />
                      Status
                    </div>
                  </TableHead>
                  <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab hover:text-gray-400" />
                      Scans
                    </div>
                  </TableHead>
                  <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab hover:text-gray-400" />
                      Discount
                    </div>
                  </TableHead>
                  <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab hover:text-gray-400" />
                      Created
                    </div>
                  </TableHead>
                  <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12 text-right rounded-tr-lg">
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.length ? (
                  filteredCodes.map((code) => (
                  <TableRow 
                    key={code.id} 
                    className={cn(
                      "border-b border-gray-50 transition-colors hover:bg-gray-50",
                      !code.is_active && "opacity-60"
                    )}
                  >
                    <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <QrCode 
                        className="h-5 w-5"
                        style={{ color: code.qr_style?.foreground || '#F4610B' }}
                      />
                      <span className="font-mono font-semibold">{code.code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {code.product?.image_url && (
                        <div className="relative h-8 w-8 rounded overflow-hidden bg-gray-100">
                          <Image
                            src={code.product.image_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      )}
                      <span className="text-sm">{getProductName(code.product)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant={code.is_active ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        code.is_active && "bg-green-100 text-green-700 hover:bg-green-100"
                      )}
                    >
                      {code.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="flex items-center gap-1 text-sm">
                      <TrendingUp className="h-3 w-3" />
                      {code.current_uses}
                      {code.max_uses && <span className="text-gray-400">/ {code.max_uses}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    {code.discount_percent ? (
                      <Badge variant="outline">{code.discount_percent}%</Badge>
                    ) : code.discount_amount ? (
                      <Badge variant="outline">SAR {code.discount_amount}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-sm text-gray-500">
                    {new Date(code.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => copyLink(code.code)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy Link</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => downloadQR(code)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download QR</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleCodeStatus(code)}>
                            {code.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteCode(code)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
                  ))
                ) : (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="h-[400px] text-center"
                    >
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                          <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-600 font-medium">No gift codes found</p>
                          <p className="text-sm text-gray-400">Try adjusting your filters or search criteria</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
          </div>
        </div>
      )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gift Code Preview</DialogTitle>
            <DialogDescription>
              Scan this QR code to send {previewCode?.product?.name_en} as a gift
            </DialogDescription>
          </DialogHeader>
          
          {previewCode && (
            <div className="space-y-4 py-4">
              {/* Large QR Preview */}
              <div 
                className="aspect-square rounded-2xl flex items-center justify-center p-8"
                style={{ backgroundColor: previewCode.qr_style?.background || '#FFFFFF' }}
              >
                <div className="text-center">
                  <QrCode 
                    className="h-40 w-40 mx-auto mb-4"
                    style={{ color: previewCode.qr_style?.foreground || '#F4610B' }}
                  />
                  <p 
                    className="font-mono text-xl font-bold"
                    style={{ color: previewCode.qr_style?.foreground || '#F4610B' }}
                  >
                    {previewCode.code}
                  </p>
                </div>
              </div>
              
              {/* Gift URL */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <code className="flex-1 text-sm text-gray-600 truncate">
                  haady.app/g/{previewCode.code}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyLink(previewCode.code)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Product Preview */}
              <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl">
                {previewCode.product?.image_url && (
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-white">
                    <Image
                      src={previewCode.product.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">{getProductName(previewCode.product)}</p>
                  <p className="text-sm text-gray-500">
                    {previewCode.product?.price ? `SAR ${previewCode.product.price}` : 'No price'}
                  </p>
                  {previewCode.discount_percent && (
                    <Badge className="mt-1 bg-green-100 text-green-700 hover:bg-green-100">
                      {previewCode.discount_percent}% off for gift
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => downloadQR(previewCode!)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})

GiftCodeGenerator.displayName = 'GiftCodeGenerator'

