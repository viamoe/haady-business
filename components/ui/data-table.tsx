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
import { ChevronDown, RefreshCw, LayoutGrid, List, Search, SlidersHorizontal, GripVertical, Clock, X } from "lucide-react"

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

type ViewMode = "table" | "cards"

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
  onRowClick?: (row: TData) => void
  onRefresh?: () => void
  renderCard?: (item: TData, index: number) => React.ReactNode
  defaultView?: ViewMode
  isRefreshing?: boolean
  filters?: FilterConfig[]
  // Filter functions - pass these to enable filtering
  getStatus?: (item: TData) => 'in-stock' | 'low-stock' | 'out-of-stock'
  getVisibility?: (item: TData) => 'published' | 'draft'
  getCreatedAt?: (item: TData) => string | Date
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onRowClick,
  onRefresh,
  renderCard,
  defaultView = "table",
  isRefreshing: isRefreshingProp = false,
  filters = [],
  getStatus,
  getVisibility,
  getCreatedAt,
}: DataTableProps<TData, TValue>) {
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultView)
  const [isRefreshingInternal, setIsRefreshingInternal] = React.useState(false)
  const isRefreshing = isRefreshingProp || isRefreshingInternal
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  // Filter states
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [visibilityFilter, setVisibilityFilter] = React.useState<string>("all")
  const [dateFilter, setDateFilter] = React.useState<string>("all")

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

    // Apply visibility filter
    if (visibilityFilter !== "all" && getVisibility) {
      result = result.filter((item) => {
        const visibility = getVisibility(item)
        return visibility === visibilityFilter
      })
    }

    // Apply date filter
    if (dateFilter !== "all" && getCreatedAt) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      result = result.filter((item) => {
        const createdAt = new Date(getCreatedAt(item))
        switch (dateFilter) {
          case "today":
            return createdAt >= today
          case "week":
            return createdAt >= weekAgo
          case "month":
            return createdAt >= monthAgo
          default:
            return true
        }
      })
    }

    return result
  }, [data, statusFilter, visibilityFilter, dateFilter, getStatus, getVisibility, getCreatedAt])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

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

  const clearAllFilters = () => {
    setStatusFilter("all")
    setVisibilityFilter("all")
    setDateFilter("all")
  }

  const activeFilterCount = [
    statusFilter !== "all",
    visibilityFilter !== "all",
    dateFilter !== "all"
  ].filter(Boolean).length
  
  const hasActiveFilters = activeFilterCount > 0
  const hasMultipleActiveFilters = activeFilterCount > 1

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
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
                .filter((column) => column.getCanHide())
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
                  {statusFilter === "all" ? "All Status" : 
                   statusFilter === "in-stock" ? "In Stock" : 
                   statusFilter === "low-stock" ? "Low Stock" : "Out of Stock"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                <SelectItem value="all" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">All Status</SelectItem>
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

          {/* Visibility Filter */}
          <div className="relative">
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className={cn(
                "h-10 w-[130px] rounded-lg border-0 text-sm font-medium hover:bg-gray-100 shadow-none",
                visibilityFilter !== "all" 
                  ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20 [&_svg]:!text-[#F4610B] [&_svg]:!opacity-100" 
                  : "bg-gray-50 text-gray-700"
              )}>
                <SelectValue>
                  {visibilityFilter === "all" ? "All Visibility" : 
                   visibilityFilter === "published" ? "Published" : "Draft"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                <SelectItem value="all" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">All Visibility</SelectItem>
                <SelectItem value="published" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Published</SelectItem>
                <SelectItem value="draft" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Draft</SelectItem>
              </SelectContent>
            </Select>
            {visibilityFilter !== "all" && (
              <button
                onClick={() => setVisibilityFilter("all")}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#F4610B] text-white flex items-center justify-center hover:bg-[#d9560a] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className={cn(
                "h-10 w-[140px] rounded-lg border-0 text-sm font-medium hover:bg-gray-100 shadow-none",
                dateFilter !== "all" 
                  ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20 [&_svg]:!text-[#F4610B] [&_svg]:!opacity-100" 
                  : "bg-gray-50 text-gray-700"
              )}>
                <SelectValue>
                  {dateFilter === "all" ? "All Time" : 
                   dateFilter === "today" ? "Today" : 
                   dateFilter === "week" ? "This Week" : "This Month"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                <SelectItem value="all" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">All Time</SelectItem>
                <SelectItem value="today" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Today</SelectItem>
                <SelectItem value="week" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">This Week</SelectItem>
                <SelectItem value="month" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">This Month</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter !== "all" && (
              <button
                onClick={() => setDateFilter("all")}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#F4610B] text-white flex items-center justify-center hover:bg-[#d9560a] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Clear All Filters Button - only show when 2+ filters are active */}
          {hasMultipleActiveFilters && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-10 w-10 p-0 rounded-lg border-0 bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B] hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                  Clear all filters
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Right side - View toggle, Updated time and refresh */}
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          {renderCard && (
            <div className="flex items-center rounded-lg bg-gray-50 p-0.5 relative">
              <div 
                className={cn(
                  "absolute h-8 w-[calc(50%-1px)] bg-[#F4610B] rounded-md",
                  viewMode === "table" ? "left-0.5" : "left-[calc(50%+1px)]"
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
      </div>

      {/* Table Content */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {/* Refreshing overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Refreshing...</span>
            </div>
          </div>
        )}
        
        <div className="overflow-auto flex-1">
          {viewMode === "table" ? (
            <Table>
              <TableHeader className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-gray-100 hover:bg-transparent">
                    {headerGroup.headers.map((header, index) => {
                      const isFirstCol = index === 0
                      const isLastCol = index === headerGroup.headers.length - 1
                      return (
                        <TableHead 
                          key={header.id}
                          className={cn(
                            "bg-gray-50 text-gray-600 font-medium text-sm h-12",
                            isFirstCol && "rounded-tl-lg",
                            isLastCol && "rounded-tr-lg"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {/* Drag handle - skip for actions column */}
                            {header.id !== 'actions' && (
                              <GripVertical className="h-4 w-4 text-gray-300 cursor-grab hover:text-gray-400" />
                            )}
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      onClick={() => onRowClick?.(row.original)}
                      className={cn(
                        "border-b border-gray-50 transition-colors",
                        onRowClick && "cursor-pointer",
                        "hover:bg-gray-50"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell
                      colSpan={columns.length}
                      className="h-[400px] text-center"
                    >
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                          <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-600 font-medium">No results found</p>
                          <p className="text-sm text-gray-400">Try adjusting your filters or search criteria</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
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
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-gray-600 font-medium">No results found</p>
                    <p className="text-sm text-gray-400">Try adjusting your filters or search criteria</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with Pagination */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} of {data.length} products
          {hasActiveFilters && " (filtered)"}
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
