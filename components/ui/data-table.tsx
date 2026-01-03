"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, RefreshCw, LayoutGrid, List, Search, SlidersHorizontal, GripVertical, Clock, X, PanelLeftClose, Globe, FileEdit, Archive, Trash2, LayoutList } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ViewMode = "table" | "cards" | "split"

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onRowClick?: (row: TData) => void | boolean
  onRefresh?: () => void
  renderCard?: (item: TData, index: number) => React.ReactNode
  renderSplitView?: (data: TData[], selectedItem: TData | null, onSelectItem: (item: TData) => void) => React.ReactNode
  defaultView?: ViewMode
  isRefreshing?: boolean
  refreshingMessage?: string // Custom message to show during refresh
  filters?: FilterConfig[]
  // Filter functions - pass these to enable filtering
  getStatus?: (item: TData) => 'in-stock' | 'low-stock' | 'out-of-stock'
  getVisibility?: (item: TData) => 'published' | 'draft'
  getCreatedAt?: (item: TData) => string | Date
  // Custom tabs to render in the filter area
  customTabs?: React.ReactNode
  // Custom empty state
  emptyState?: {
    icon?: React.ComponentType<{ className?: string }>
    title?: string
    description?: string
  }
  // Bulk actions
  enableRowSelection?: boolean
  bulkActions?: {
    label: string | ((selectedRows: TData[]) => string)
    icon?: React.ComponentType<{ className?: string }>
    onClick: (selectedRows: TData[]) => void
    variant?: 'default' | 'destructive'
  }[]
  onSelectionChange?: (selectedRows: TData[]) => void
  clearSelectionTrigger?: string | number // When this changes, clear selection
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onRowClick,
  onRefresh,
  renderCard,
  renderSplitView,
  defaultView = "table",
  isRefreshing: isRefreshingProp = false,
  refreshingMessage,
  filters = [],
  getStatus,
  getVisibility,
  getCreatedAt,
  customTabs,
  emptyState,
  enableRowSelection = false,
  bulkActions = [],
  onSelectionChange,
  clearSelectionTrigger,
}: DataTableProps<TData, TValue>) {
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultView)
  const [selectedSplitItem, setSelectedSplitItem] = React.useState<TData | null>(null)
  const [isRefreshingInternal, setIsRefreshingInternal] = React.useState(false)
  const isRefreshing = isRefreshingProp || isRefreshingInternal
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [shouldAnimate, setShouldAnimate] = React.useState(false)

  // Filter states
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  // Filter the data based on selected filters
  const filteredData = React.useMemo(() => {
    let result = [...data]

    // Apply status filter
    if (statusFilter !== "all" && getStatus) {
      result = result.filter((item) => {
        const status = getStatus(item)
        return status === statusFilter
      })
    }

    return result
  }, [data, statusFilter, getStatus])

  // Add checkbox column if row selection is enabled
  const columnsWithSelection = React.useMemo(() => {
    if (!enableRowSelection) return columns
    
    const checkboxColumn: ColumnDef<TData, TValue> = {
      id: 'select',
      size: 50,
      minSize: 50,
      maxSize: 50,
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => (
        <div className="flex items-center justify-center w-full h-full">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="mx-auto data-[state=checked]:bg-[#F4610B] data-[state=checked]:border-[#F4610B] focus-visible:border-[#F4610B] focus-visible:ring-[#F4610B]/50"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-full h-full" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
            className="mx-auto data-[state=checked]:bg-[#F4610B] data-[state=checked]:border-[#F4610B] focus-visible:border-[#F4610B] focus-visible:ring-[#F4610B]/50 pointer-events-none"
          />
        </div>
      ),
    }
    
    return [checkboxColumn, ...columns]
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data: filteredData,
    columns: columnsWithSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // Get selected rows
  const selectedRows = React.useMemo(() => {
    if (Object.keys(rowSelection).length === 0) return []
    return table.getFilteredSelectedRowModel().rows.map(row => row.original)
  }, [table, rowSelection, filteredData])

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedRows)
    }
  }, [selectedRows, onSelectionChange])

  // Clear selection when trigger changes (e.g., when tab changes)
  React.useEffect(() => {
    if (clearSelectionTrigger !== undefined) {
      table.resetRowSelection()
    }
  }, [clearSelectionTrigger, table])

  // Trigger animation when data changes or table loads
  React.useEffect(() => {
    if (filteredData.length > 0) {
      setShouldAnimate(true)
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setShouldAnimate(false)
      }, 1000) // Allow time for all rows to animate
      return () => clearTimeout(timer)
    }
  }, [filteredData.length, data])

  const handleRefresh = async () => {
    setIsRefreshingInternal(true)
    try {
      if (onRefresh) {
        await onRefresh()
      } else {
        setColumnFilters([])
        setSorting([])
        table.resetColumnFilters()
        table.resetSorting()
      }
    } finally {
      setTimeout(() => setIsRefreshingInternal(false), 300)
    }
  }

  const clearStatusFilter = () => {
    setStatusFilter("all")
  }

  const hasActiveStatusFilter = statusFilter !== "all"

  const hasSelectedRows = selectedRows.length > 0

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-5 h-20 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Show selection info and bulk actions when rows are selected */}
          {hasSelectedRows ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {selectedRows.length} {selectedRows.length === 1 ? 'product' : 'products'} selected
                </span>
                <div className="h-4 w-px bg-gray-300" />
              </div>
              <div className="flex items-center gap-2">
                {bulkActions.map((action, index) => {
                  const Icon = action.icon
                  const label = typeof action.label === 'function' ? action.label(selectedRows) : action.label
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => action.onClick(selectedRows)}
                      className={cn(
                        "h-9 px-4 rounded-lg font-medium transition-all duration-200",
                        action.variant === 'destructive' 
                          ? "bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border-red-200 hover:border-red-600" 
                          : "bg-[#F4610B]/10 hover:bg-[#F4610B] text-[#F4610B] hover:text-white border-[#F4610B]/20 hover:border-[#F4610B]"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {label}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.resetRowSelection()}
                  className="h-9 px-4 rounded-lg font-medium bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-700 transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                  Clear selection
                </Button>
              </div>
            </>
          ) : (
            <>
          {/* Column Visibility Management */}
          <DropdownMenu>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 rounded-lg border-0 bg-gray-50 hover:bg-gray-100"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                  Manage columns
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="start" className="w-48 border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide() && column.id !== 'actions')
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id === 'name_en' ? 'Product' : column.id.replace(/_/g, ' ')}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

              {/* Custom Tabs */}
              {customTabs}
            </>
          )}
        </div>

        {/* Right side - Stock Level filter, View toggle, Updated time and refresh */}
        {!hasSelectedRows && (
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn(
                  "h-10 w-[130px] rounded-lg border-0 text-sm font-medium hover:bg-gray-100 shadow-none",
                  statusFilter !== "all" 
                    ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20 [&_svg]:!text-[#F4610B] [&_svg]:!opacity-100" 
                    : "bg-gray-50 text-gray-700"
                )}>
                  <SelectValue>
                    {statusFilter === "all" ? "Stock Level" : 
                     statusFilter === "in-stock" ? "In Stock" : 
                     statusFilter === "low-stock" ? "Low Stock" : "Out of Stock"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                  <SelectItem value="all" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">All Stock</SelectItem>
                  <SelectItem value="in-stock" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">In Stock</SelectItem>
                  <SelectItem value="low-stock" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              {statusFilter !== "all" && (
                <button
                  onClick={() => setStatusFilter("all")}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#F4610B] text-white flex items-center justify-center hover:bg-[#d9560a] transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* View Toggle */}
            {(renderCard || renderSplitView) && (
              <div className="flex items-center rounded-lg bg-gray-50 p-0.5 relative">
                {/* Sliding background indicator */}
                <div 
                  className={cn(
                    "absolute h-8 bg-[#F4610B] rounded-md",
                    renderSplitView ? "w-[calc(33.33%-2px)]" : "w-[calc(50%-1px)]"
                  )}
                  style={{
                    left: viewMode === "table" 
                      ? "2px" 
                      : viewMode === "cards" 
                        ? (renderSplitView ? "calc(33.33% + 1px)" : "calc(50% + 1px)")
                        : "calc(66.66% + 1px)",
                    transition: "left 650ms linear(0, 0.1162, 0.3622, 0.6245, 0.8404, 0.9868, 1.0661, 1.0937, 1.0885, 1.0672, 1.042, 1.02, 1.0043, 0.9952, 0.9914, 0.9913, 0.993, 0.9954, 0.9976, 0.9993, 1.0003, 1)"
                  }}
                />
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("table")}
                        className={cn(
                          "h-8 px-3 rounded-md transition-all duration-200 ease-out z-10 hover:bg-transparent",
                          viewMode === "table" 
                            ? "text-white pointer-events-none" 
                            : "text-gray-500"
                        )}
                      >
                        <List className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          viewMode === "table" && "scale-110"
                        )} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                      Table view
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("cards")}
                        className={cn(
                          "h-8 px-3 rounded-md transition-all duration-200 ease-out z-10 hover:bg-transparent",
                          viewMode === "cards" 
                            ? "text-white pointer-events-none" 
                            : "text-gray-500"
                        )}
                      >
                        <LayoutGrid className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          viewMode === "cards" && "scale-110"
                        )} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                      Card view
                    </TooltipContent>
                  </Tooltip>
                  {renderSplitView && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewMode("split")}
                          className={cn(
                            "h-8 px-3 rounded-md transition-all duration-200 ease-out z-10 hover:bg-transparent",
                            viewMode === "split" 
                              ? "text-white pointer-events-none" 
                              : "text-gray-500"
                          )}
                        >
                          <PanelLeftClose className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            viewMode === "split" && "scale-110"
                          )} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                        Split view
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            )}

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-10 w-10 p-0 rounded-lg bg-gray-50 hover:bg-gray-100 border-0"
                  >
                    <RefreshCw className={cn("h-4 w-4 text-gray-500", isRefreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                  Refresh
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {/* Refreshing overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">{refreshingMessage || 'Refreshing...'}</span>
            </div>
          </div>
        )}
        
        <div className="overflow-auto flex-1">
          {viewMode === "table" && (
            <Table className="w-full">
              <TableHeader className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => {
                  const isAllSelected = table.getIsAllPageRowsSelected()
                  return (
                    <TableRow key={headerGroup.id} className="border-b border-gray-100 hover:bg-transparent">
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead 
                            key={header.id}
                              data-all-selected={isAllSelected ? "true" : undefined}
                              className={cn(
                                "font-medium text-sm h-12",
                                isAllSelected 
                                  ? "bg-[#F4610B] text-white" 
                                  : "bg-gray-50 text-gray-600",
                                header.id === 'actions' && cn(
                                  "sticky right-0 z-10 !px-0 pointer-events-none",
                                  isAllSelected ? "bg-[#F4610B]" : "bg-gray-50"
                                ),
                                header.id === 'select' && "!px-0 !pl-0 !pr-0"
                              )}
                          style={{
                            width: header.column.columnDef.size 
                              ? `${header.column.columnDef.size}px` 
                              : header.id === 'actions' && !header.column.columnDef.size
                              ? '150px'
                              : undefined,
                            minWidth: header.column.columnDef.minSize 
                              ? `${header.column.columnDef.minSize}px` 
                              : undefined,
                            maxWidth: header.column.columnDef.maxSize 
                              ? `${header.column.columnDef.maxSize}px` 
                              : undefined,
                          }}
                        >
                          {header.id === 'select' ? (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          ) : header.id === 'actions' ? (
                            // Empty actions header - completely non-interactive
                            <div className="pointer-events-none" />
                          ) : (
                            <div className={cn(
                              "flex items-center gap-2 w-full",
                              isAllSelected && "[&_*]:!text-white [&_svg]:!text-white [&_button]:!text-white [&_span]:!text-white"
                            )}>
                              {/* Drag handle - skip for select column */}
                              {header.id !== 'select' && (
                                <GripVertical className={cn(
                                  "h-4 w-4 cursor-grab flex-shrink-0",
                                  isAllSelected ? "!text-white/70 hover:!text-white" : "text-gray-300 hover:text-gray-400"
                                )} />
                              )}
                              {header.isPlaceholder
                                ? null
                                : (
                                  <div className={cn(
                                    "w-full flex-1 min-w-0 h-full flex items-center",
                                    isAllSelected && "!text-white [&_*]:!text-white [&_svg]:!text-white [&_button]:!text-white [&_span]:!text-white"
                                  )}>
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                  )
                })}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      onClick={(e) => {
                        // Don't trigger row click if clicking on checkbox
                        if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) {
                          return
                        }
                        // If row selection is enabled, check if onRowClick wants to toggle selection
                        if (enableRowSelection && onRowClick) {
                          const result = onRowClick(row.original)
                          // If onRowClick explicitly returns false, toggle selection instead
                          if (result === false) {
                            row.toggleSelected()
                            return
                          }
                          // If result is true or undefined, onRowClick handled it (or default behavior)
                          return
                        } else if (enableRowSelection && !onRowClick) {
                          // If row selection is enabled but no onRowClick handler, toggle selection
                          row.toggleSelected()
                          return
                        }
                        // Default behavior: call onRowClick if provided
                        onRowClick?.(row.original)
                      }}
                      className={cn(
                        "border-b border-gray-50 transition-colors group",
                        onRowClick && "cursor-pointer",
                        row.getIsSelected() && "!bg-[rgba(244,97,11,0.03)]",
                        !row.getIsSelected() && "hover:bg-gray-50",
                        shouldAnimate && "animate-tableRowFadeIn"
                      )}
                      style={{
                        ...(row.getIsSelected() ? { backgroundColor: 'rgba(244, 97, 11, 0.03)' } : {}),
                        ...(shouldAnimate ? { 
                          animationDelay: `${Math.min(index, 20) * 30}ms`,
                          opacity: 0
                        } : {})
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        // Override whitespace-nowrap for product name column
                        const isProductColumn = cell.column.id === 'name_en'
                        const isActionsColumn = cell.column.id === 'actions'
                        const isSelectColumn = cell.column.id === 'select'
                        return (
                          <TableCell 
                            key={cell.id} 
                            onClick={isSelectColumn ? (e) => {
                              e.stopPropagation()
                              row.toggleSelected()
                            } : undefined}
                            className={cn(
                              "py-4",
                              isProductColumn && "whitespace-normal",
                              isActionsColumn && `sticky right-0 z-20 !px-0 ${row.getIsSelected() ? 'bg-[rgba(244,97,11,0.03)] group-hover:bg-[rgba(244,97,11,0.05)]' : 'bg-white group-hover:bg-gray-50'}`,
                              isSelectColumn && `!px-0 !pl-0 !pr-0 cursor-pointer ${row.getIsSelected() ? 'bg-[rgba(244,97,11,0.03)]' : ''}`
                            )}
                            style={{
                              width: cell.column.columnDef.size 
                                ? `${cell.column.columnDef.size}px` 
                                : isActionsColumn && !cell.column.columnDef.size
                                ? 'fit-content'
                                : undefined,
                              minWidth: cell.column.columnDef.minSize 
                                ? `${cell.column.columnDef.minSize}px` 
                                : undefined,
                              maxWidth: cell.column.columnDef.maxSize 
                                ? `${cell.column.columnDef.maxSize}px` 
                                : undefined,
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell
                      colSpan={columnsWithSelection.length}
                      className="h-[400px] text-center align-middle"
                    >
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                          {emptyState?.icon ? (
                            <emptyState.icon className="h-8 w-8 text-gray-400" />
                          ) : (
                            <Search className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-gray-600 font-medium">
                            {emptyState?.title || "No results found"}
                          </p>
                          <p className="text-sm text-gray-400">
                            {emptyState?.description || "Try adjusting your filters or search criteria"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          
          {viewMode === "cards" && (
            /* Cards View */
            <div className="p-4">
              {table.getRowModel().rows?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                  {table.getRowModel().rows.map((row, index) => (
                    <div key={row.id} onClick={() => onRowClick?.(row.original)}>
                      {renderCard?.(row.original, index)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] gap-3">
                  <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                    {emptyState?.icon ? (
                      <emptyState.icon className="h-8 w-8 text-gray-400" />
                    ) : (
                      <Search className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-gray-600 font-medium">
                      {emptyState?.title || "No results found"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {emptyState?.description || "Try adjusting your filters or search criteria"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === "split" && renderSplitView && (
            /* Split/Master-Detail View */
            <div className="h-full">
              {renderSplitView(filteredData, selectedSplitItem, setSelectedSplitItem)}
            </div>
          )}
        </div>
      </div>

      {/* Footer with Pagination */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} of {data.length} products
          {hasActiveStatusFilter && " (filtered)"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-9 px-4 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Previous
          </Button>
          <div className="text-sm text-gray-500 px-3">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-9 px-4 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
