'use client'

import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ArrowRight,
  ArrowLeftRight,
  Package,
  Building2,
  GripVertical,
  Search,
  Check,
  AlertCircle,
  Loader2,
  ArrowRightLeft,
  MoveRight,
  Boxes,
} from 'lucide-react'
import Image from 'next/image'

// DND Kit imports
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface StoreBranch {
  id: string
  store_id?: string
  name: string
  name_ar: string | null
  code: string | null
  address: string | null
  city?: string | null
  is_main_branch: boolean
  is_active?: boolean
}

interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  sku: string | null
  image_url: string | null
  price: number | null
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

interface InventoryItem {
  id: string
  product_id: string
  branch_id: string | null
  store_id: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  product?: Product
  branch?: StoreBranch
}

interface TransferItem {
  product: Product
  sourceInventory: InventoryItem
  quantity: number
}

interface InventoryTransferProps {
  storeId: string
  branches: StoreBranch[]
  inventory: InventoryItem[]
  products: Product[]
  onTransferComplete?: () => void
  locale?: string
}

// Draggable Product Card Component
function DraggableProductCard({ 
  product, 
  inv, 
  onTransfer,
  getProductName,
  targetBranchName
}: { 
  product: Product
  inv: InventoryItem
  onTransfer: () => void
  getProductName: (p: Product | undefined) => string
  targetBranchName: string
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${product.id}-${inv.id}`,
    data: { product, inventory: inv }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-white rounded-xl border transition-all duration-200",
        "hover:shadow-md hover:border-orange-200",
        isDragging 
          ? "border-orange-400 ring-2 ring-orange-300 scale-95 z-50" 
          : "border-gray-100"
      )}
    >
      {/* Drag Handle */}
      <div 
        {...listeners}
        {...attributes}
        className="flex items-center justify-center w-6 text-gray-400 hover:text-orange-500 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      {/* Product Image */}
      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={getProductName(product)}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{getProductName(product)}</p>
        {product.sku && (
          <p className="text-xs text-gray-400 font-mono truncate">{product.sku}</p>
        )}
      </div>
      
      {/* Quantity Badge */}
      <Badge 
        variant="secondary" 
        className={cn(
          "text-xs font-semibold tabular-nums px-2",
          inv.available_quantity > 10 && "bg-green-100 text-green-700",
          inv.available_quantity <= 10 && inv.available_quantity > 0 && "bg-amber-100 text-amber-700",
          inv.available_quantity === 0 && "bg-red-100 text-red-700"
        )}
      >
        {inv.available_quantity}
      </Badge>
      
      {/* Transfer Button */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-orange-500 hover:bg-orange-50"
              onClick={onTransfer}
            >
              <MoveRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            Transfer to {targetBranchName || 'target branch'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// Droppable Branch Card Component
function DroppableBranchCard({ 
  branch, 
  isSource, 
  isTarget,
  children,
  branchInventory,
  totalQuantity,
  getBranchName
}: { 
  branch: StoreBranch
  isSource?: boolean
  isTarget?: boolean
  children: React.ReactNode
  branchInventory: InventoryItem[]
  totalQuantity: number
  getBranchName: (b: StoreBranch | undefined) => string
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: branch.id,
    data: { branch }
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[350px] rounded-2xl transition-all duration-300 p-1",
        isOver && "bg-orange-100 scale-[1.02]"
      )}
    >
      <Card 
        className={cn(
          "h-full rounded-xl transition-all duration-300 overflow-hidden",
          isSource && "border-2 border-orange-400 shadow-lg shadow-orange-100",
          isTarget && "border-2 border-blue-400 shadow-lg shadow-blue-100",
          isOver && "border-2 border-dashed border-orange-500 bg-orange-50",
          !isSource && !isTarget && !isOver && "border border-gray-200"
        )}
      >
        <CardHeader className={cn(
          "pb-3",
          isSource && "bg-gradient-to-r from-orange-50 to-white",
          isTarget && "bg-gradient-to-r from-blue-50 to-white",
          isOver && "bg-orange-100"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                isSource && "bg-orange-100",
                isTarget && "bg-blue-100",
                isOver && "bg-orange-200",
                !isSource && !isTarget && !isOver && "bg-gray-100"
              )}>
                <Building2 className={cn(
                  "h-5 w-5",
                  isSource && "text-orange-500",
                  isTarget && "text-blue-500",
                  isOver && "text-orange-600",
                  !isSource && !isTarget && !isOver && "text-gray-500"
                )} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {getBranchName(branch)}
                  {branch.is_main_branch && (
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px]">Main</Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-gray-500">
                  {branchInventory.length} products • {totalQuantity} units
                </p>
              </div>
            </div>
            
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-medium",
                isSource && "border-orange-400 text-orange-600 bg-orange-50",
                isTarget && "border-blue-400 text-blue-600 bg-blue-50",
                isOver && "border-orange-500 text-orange-700 bg-orange-100"
              )}
            >
              {isSource ? 'Source' : isTarget ? 'Target' : branch.code || 'Branch'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Drop indicator */}
          {isOver && (
            <div className="mb-3 p-4 rounded-xl bg-orange-200 border-2 border-dashed border-orange-400 text-center animate-pulse">
              <ArrowRightLeft className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-orange-700">Drop here to transfer!</p>
            </div>
          )}
          
          {/* Products list */}
          <div className="h-[350px] overflow-y-auto pr-2 space-y-2 pt-4">
            {children}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Product Overlay (shown while dragging)
function ProductOverlay({ product, inv, getProductName }: { product: Product, inv: InventoryItem, getProductName: (p: Product | undefined) => string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-orange-400 shadow-2xl w-[300px]">
      <div className="flex items-center justify-center w-6 text-orange-500">
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={getProductName(product)}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{getProductName(product)}</p>
        {product.sku && (
          <p className="text-xs text-gray-400 font-mono truncate">{product.sku}</p>
        )}
      </div>
      
      <Badge 
        variant="secondary" 
        className="text-xs font-semibold tabular-nums px-2 bg-orange-100 text-orange-700"
      >
        {inv.available_quantity}
      </Badge>
    </div>
  )
}

export function InventoryTransfer({
  storeId,
  branches,
  inventory,
  products,
  onTransferComplete,
  locale = 'en',
}: InventoryTransferProps) {
  // State
  const [sourceBranchId, setSourceBranchId] = useState<string>('')
  const [targetBranchId, setTargetBranchId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [transferItems, setTransferItems] = useState<TransferItem[]>([])
  const [transferDialog, setTransferDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null)
  const [transferQuantity, setTransferQuantity] = useState(1)
  const [isTransferring, setIsTransferring] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeDragData, setActiveDragData] = useState<{ product: Product; inventory: InventoryItem } | null>(null)

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  )

  // Get branch name
  const getBranchName = useCallback((branch: StoreBranch | undefined) => {
    if (!branch) return 'Unknown'
    return locale === 'ar' && branch.name_ar ? branch.name_ar : branch.name
  }, [locale])

  // Get product name
  const getProductName = useCallback((product: Product | undefined) => {
    if (!product) return 'Unknown'
    return locale === 'ar' && product.name_ar ? product.name_ar : product.name_en || 'Unnamed Product'
  }, [locale])

  // Get inventory for a specific branch
  const getBranchInventory = useCallback((branchId: string) => {
    return inventory
      .filter(i => i.branch_id === branchId && i.available_quantity > 0)
      .map(i => ({
        ...i,
        product: products.find(p => p.id === i.product_id)
      }))
      .filter(i => i.product)
      .filter(i => {
        if (!searchTerm) return true
        const product = i.product!
        const searchLower = searchTerm.toLowerCase()
        return (
          product.name_en?.toLowerCase().includes(searchLower) ||
          product.name_ar?.toLowerCase().includes(searchLower) ||
          product.sku?.toLowerCase().includes(searchLower)
        )
      })
  }, [inventory, products, searchTerm])

  // Source and target branches
  const sourceBranch = useMemo(() => branches.find(b => b.id === sourceBranchId), [branches, sourceBranchId])
  const targetBranch = useMemo(() => branches.find(b => b.id === targetBranchId), [branches, targetBranchId])

  // Get available branches for target (exclude source)
  const availableTargetBranches = useMemo(() => {
    return branches.filter(b => b.id !== sourceBranchId)
  }, [branches, sourceBranchId])

  // Source and target inventory
  const sourceInventory = useMemo(() => getBranchInventory(sourceBranchId), [getBranchInventory, sourceBranchId])
  const targetInventory = useMemo(() => getBranchInventory(targetBranchId), [getBranchInventory, targetBranchId])
  
  const sourceTotalQuantity = sourceInventory.reduce((sum, i) => sum + i.available_quantity, 0)
  const targetTotalQuantity = targetInventory.reduce((sum, i) => sum + i.available_quantity, 0)

  // Swap branches
  const swapBranches = () => {
    const temp = sourceBranchId
    setSourceBranchId(targetBranchId)
    setTargetBranchId(temp)
  }

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    setActiveDragData(active.data.current as { product: Product; inventory: InventoryItem })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setActiveDragData(null)
    
    if (!over) return
    
    const dragData = active.data.current as { product: Product; inventory: InventoryItem }
    const dropBranchId = over.id as string
    
    // Don't allow dropping on the same branch
    if (dragData.inventory.branch_id === dropBranchId) return
    
    // Open transfer dialog
    setSelectedProduct(dragData.product)
    setSelectedInventory(dragData.inventory)
    
    // If dropping on target branch and it's different from source
    if (dropBranchId === targetBranchId || dropBranchId === sourceBranchId) {
      setTargetBranchId(dropBranchId === sourceBranchId ? dropBranchId : targetBranchId)
    } else {
      // If dropping on a new branch, set it as target
      setTargetBranchId(dropBranchId)
    }
    
    setTransferQuantity(1)
    setTransferDialog(true)
  }

  // Open transfer dialog for a product
  const openTransferDialog = (product: Product, inv: InventoryItem) => {
    if (!targetBranchId) {
      alert('Please select a target branch first')
      return
    }
    setSelectedProduct(product)
    setSelectedInventory(inv)
    setTransferQuantity(1)
    setTransferDialog(true)
  }

  // Add item to transfer queue
  const addToTransferQueue = () => {
    if (!selectedProduct || !selectedInventory || transferQuantity <= 0) return
    
    const existingIndex = transferItems.findIndex(
      item => item.product.id === selectedProduct.id && item.sourceInventory.id === selectedInventory.id
    )
    
    if (existingIndex >= 0) {
      const newItems = [...transferItems]
      newItems[existingIndex].quantity = Math.min(
        newItems[existingIndex].quantity + transferQuantity,
        selectedInventory.available_quantity
      )
      setTransferItems(newItems)
    } else {
      setTransferItems([
        ...transferItems,
        {
          product: selectedProduct,
          sourceInventory: selectedInventory,
          quantity: Math.min(transferQuantity, selectedInventory.available_quantity),
        },
      ])
    }
    
    setTransferDialog(false)
  }

  // Remove item from transfer queue
  const removeFromTransferQueue = (index: number) => {
    setTransferItems(items => items.filter((_, i) => i !== index))
  }

  // Execute transfers
  const executeTransfers = async () => {
    if (transferItems.length === 0 || !targetBranchId) return
    
    setIsTransferring(true)
    
    try {
      for (const item of transferItems) {
        const { error } = await supabase.rpc('transfer_inventory', {
          p_product_id: item.product.id,
          p_from_branch_id: item.sourceInventory.branch_id,
          p_to_branch_id: targetBranchId,
          p_store_id: storeId,
          p_quantity: item.quantity,
          p_notes: `Transfer from ${getBranchName(sourceBranch)} to ${getBranchName(targetBranch)}`
        })
        
        if (error) throw error
      }
      
      setTransferItems([])
      onTransferComplete?.()
      
    } catch (error) {
      console.error('Transfer error:', error)
      alert('Failed to complete some transfers. Please try again.')
    } finally {
      setIsTransferring(false)
    }
  }

  // Quick transfer (direct without queue)
  const quickTransfer = async () => {
    if (!selectedProduct || !selectedInventory || !targetBranchId || transferQuantity <= 0) return
    
    setIsTransferring(true)
    
    try {
      const { error } = await supabase.rpc('transfer_inventory', {
        p_product_id: selectedProduct.id,
        p_from_branch_id: selectedInventory.branch_id,
        p_to_branch_id: targetBranchId,
        p_store_id: storeId,
        p_quantity: transferQuantity,
        p_notes: `Quick transfer`
      })
      
      if (error) throw error
      
      setTransferDialog(false)
      onTransferComplete?.()
      
    } catch (error) {
      console.error('Transfer error:', error)
      alert('Transfer failed. Please try again.')
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Source Branch Selector */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">From Branch</Label>
              <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
                <SelectTrigger className={cn(
                  "w-[180px] rounded-lg",
                  sourceBranchId && "border-orange-300 bg-orange-50"
                )}>
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent className="border-0 rounded-xl shadow-lg">
                  {branches.map((branch) => (
                    <SelectItem 
                      key={branch.id} 
                      value={branch.id}
                      className="rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        {getBranchName(branch)}
                        {branch.is_main_branch && <Badge className="text-[9px] px-1 py-0">Main</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 mt-5 rounded-full"
                    onClick={swapBranches}
                    disabled={!sourceBranchId || !targetBranchId}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Swap branches</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Target Branch Selector */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">To Branch</Label>
              <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                <SelectTrigger className={cn(
                  "w-[180px] rounded-lg",
                  targetBranchId && "border-blue-300 bg-blue-50"
                )}>
                  <SelectValue placeholder="Select target..." />
                </SelectTrigger>
                <SelectContent className="border-0 rounded-xl shadow-lg">
                  {availableTargetBranches.map((branch) => (
                    <SelectItem 
                      key={branch.id} 
                      value={branch.id}
                      className="rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        {getBranchName(branch)}
                        {branch.is_main_branch && <Badge className="text-[9px] px-1 py-0">Main</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-lg border-gray-200"
            />
          </div>
        </div>

        {/* Transfer Queue */}
        {transferItems.length > 0 && (
          <Card className="rounded-2xl border-orange-200 bg-gradient-to-r from-orange-50 to-white shadow-none">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-orange-500" />
                Transfer Queue ({transferItems.length} items)
              </CardTitle>
              <Button
                onClick={executeTransfers}
                disabled={isTransferring}
                className="bg-[#F4610B] hover:bg-[#d54e09] text-white rounded-lg w-fit"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Execute Transfers
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {transferItems.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 bg-white border border-orange-200 text-orange-800"
                  >
                    <span className="mr-2">
                      {getProductName(item.product)} × {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-orange-100 rounded-full"
                      onClick={() => removeFromTransferQueue(index)}
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Branch Cards */}
        {sourceBranchId && targetBranchId ? (
          <div className="flex gap-6 items-stretch">
            <DroppableBranchCard 
              branch={sourceBranch!} 
              isSource
              branchInventory={sourceInventory}
              totalQuantity={sourceTotalQuantity}
              getBranchName={getBranchName}
            >
              {sourceInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Boxes className="h-12 w-12 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">No products with available stock</p>
                </div>
              ) : (
                sourceInventory.map((inv) => (
                  <DraggableProductCard
                    key={inv.id}
                    product={inv.product!}
                    inv={inv}
                    onTransfer={() => openTransferDialog(inv.product!, inv)}
                    getProductName={getProductName}
                    targetBranchName={getBranchName(targetBranch)}
                  />
                ))
              )}
            </DroppableBranchCard>
            
            {/* Transfer Direction Indicator */}
            <div className="flex flex-col items-center justify-center gap-2 py-8 min-w-[80px]">
              <div className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center transition-all",
                activeId 
                  ? "bg-orange-200 animate-pulse scale-110" 
                  : "bg-gradient-to-br from-orange-100 to-blue-100"
              )}>
                <ArrowRight className={cn(
                  "h-8 w-8 transition-colors",
                  activeId ? "text-orange-600" : "text-gray-500"
                )} />
              </div>
              <p className="text-xs text-gray-400 text-center">
                {activeId ? "Drop on target!" : "Drag & drop"}
              </p>
            </div>
            
            <DroppableBranchCard 
              branch={targetBranch!} 
              isTarget
              branchInventory={targetInventory}
              totalQuantity={targetTotalQuantity}
              getBranchName={getBranchName}
            >
              {targetInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Boxes className="h-12 w-12 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">No products with available stock</p>
                </div>
              ) : (
                targetInventory.map((inv) => (
                  <DraggableProductCard
                    key={inv.id}
                    product={inv.product!}
                    inv={inv}
                    onTransfer={() => openTransferDialog(inv.product!, inv)}
                    getProductName={getProductName}
                    targetBranchName={getBranchName(sourceBranch)}
                  />
                ))
              )}
            </DroppableBranchCard>
          </div>
        ) : (
          <Card className="rounded-2xl border-dashed border-2 border-gray-200 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <ArrowRightLeft className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Select Branches to Transfer
              </h3>
              <p className="text-sm text-gray-400 text-center max-w-md">
                Choose a source branch and a target branch to start transferring inventory.
                You can drag and drop products or click the transfer button.
              </p>
            </CardContent>
          </Card>
        )}

        {/* All Branches Grid (when no selection) */}
        {!sourceBranchId && !targetBranchId && branches.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500">All Branches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch) => (
                <Card 
                  key={branch.id}
                  className="group relative rounded-3xl border-0 shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                  onClick={() => setSourceBranchId(branch.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center transition-all duration-200 group-hover:bg-orange-100">
                          <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-orange-500 transition-colors duration-200" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{getBranchName(branch)}</p>
                          <p className="text-sm text-muted-foreground font-mono">{branch.code || 'No code'}</p>
                        </div>
                      </div>
                      {branch.is_main_branch && (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-0">Main</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span>{getBranchInventory(branch.id).length} products</span>
                      <span className="font-semibold text-foreground">
                        {getBranchInventory(branch.id).reduce((sum, i) => sum + i.available_quantity, 0).toLocaleString()} units
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Transfer Dialog */}
        <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-orange-500" />
                Transfer Inventory
              </DialogTitle>
              <DialogDescription>
                Transfer {selectedProduct && getProductName(selectedProduct)} to {targetBranch && getBranchName(targetBranch)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedProduct && selectedInventory && (
              <div className="space-y-4 py-4">
                {/* Product Info */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-white">
                    {selectedProduct.image_url ? (
                      <Image
                        src={selectedProduct.image_url}
                        alt={getProductName(selectedProduct)}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{getProductName(selectedProduct)}</p>
                    {selectedProduct.sku && (
                      <p className="text-xs text-gray-400 font-mono">{selectedProduct.sku}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Available: <span className="font-semibold text-green-600">{selectedInventory.available_quantity}</span> units
                    </p>
                  </div>
                </div>

                {/* Transfer Direction */}
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{getBranchName(branches.find(b => b.id === selectedInventory.branch_id))}</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{getBranchName(targetBranch)}</span>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="space-y-2">
                  <Label>Transfer Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => setTransferQuantity(Math.max(1, transferQuantity - 1))}
                      disabled={transferQuantity <= 1}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={selectedInventory.available_quantity}
                      value={transferQuantity}
                      onChange={(e) => setTransferQuantity(Math.min(
                        parseInt(e.target.value) || 1,
                        selectedInventory.available_quantity
                      ))}
                      className="text-center font-semibold text-lg"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => setTransferQuantity(Math.min(
                        transferQuantity + 1,
                        selectedInventory.available_quantity
                      ))}
                      disabled={transferQuantity >= selectedInventory.available_quantity}
                    >
                      +
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Max: {selectedInventory.available_quantity} units
                  </p>
                </div>

                {transferQuantity > selectedInventory.available_quantity && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Quantity exceeds available stock
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setTransferDialog(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={addToTransferQueue}
                disabled={!transferQuantity || transferQuantity > (selectedInventory?.available_quantity || 0)}
                className="rounded-lg"
              >
                Add to Queue
              </Button>
              <Button
                onClick={quickTransfer}
                disabled={
                  isTransferring || 
                  !transferQuantity || 
                  transferQuantity > (selectedInventory?.available_quantity || 0)
                }
                className="bg-[#F4610B] hover:bg-[#d54e09] text-white rounded-lg w-fit"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Transfer Now
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Drag Overlay - shows the dragged item */}
      <DragOverlay>
        {activeDragData && (
          <ProductOverlay 
            product={activeDragData.product} 
            inv={activeDragData.inventory}
            getProductName={getProductName}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
