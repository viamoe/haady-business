'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  QrCode,
  TrendingUp,
  TrendingDown,
  Gift,
  Package,
  Users,
  DollarSign,
  Target,
  Calendar,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
  Smartphone,
  Globe,
} from 'lucide-react'
import Image from 'next/image'

interface AnalyticsSummary {
  total_scans: number
  unique_scanners: number
  total_conversions: number
  total_revenue: number
  conversion_rate: number
  avg_order_value: number
}

interface DailyData {
  date: string
  scans: number
  conversions: number
  revenue: number
}

interface TopProduct {
  id: string
  name: string
  image_url: string | null
  price: number
  gift_count: number
  revenue: number
}

interface RecentScan {
  id: string
  scanned_at: string
  scan_source: string
  converted: boolean
  code: {
    code: string
    product: {
      name_en: string
      image_url: string | null
    }
  }
}

interface RecentOrder {
  id: string
  order_number: string
  recipient_username: string
  total_amount: number
  status: string
  created_at: string
  product: {
    name_en: string
    image_url: string | null
  }
}

interface GiftAnalytics {
  period: { start: string; end: string }
  summary: AnalyticsSummary
  daily: DailyData[]
  top_products: TopProduct[]
  recent_scans: RecentScan[]
  recent_orders: RecentOrder[]
}

interface GiftAnalyticsDashboardProps {
  storeId: string
}

export function GiftAnalyticsDashboard({ storeId }: GiftAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<GiftAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const [previousAnalytics, setPreviousAnalytics] = useState<AnalyticsSummary | null>(null)

  // Calculate date range
  const getDateRange = useCallback((range: string) => {
    const end = new Date()
    const start = new Date()
    
    switch (range) {
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
      case '1y':
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        start.setDate(start.getDate() - 30)
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }, [])

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange(dateRange)
      
      const response = await fetch(
        `/api/gift-codes/analytics?store_id=${storeId}&start_date=${start}&end_date=${end}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      
      const data = await response.json()
      setAnalytics(data)
      
      // Fetch previous period for comparison
      const prevStart = new Date(start)
      const prevEnd = new Date(end)
      const diff = prevEnd.getTime() - prevStart.getTime()
      prevStart.setTime(prevStart.getTime() - diff)
      prevEnd.setTime(prevEnd.getTime() - diff)
      
      const prevResponse = await fetch(
        `/api/gift-codes/analytics?store_id=${storeId}&start_date=${prevStart.toISOString().split('T')[0]}&end_date=${prevEnd.toISOString().split('T')[0]}`
      )
      
      if (prevResponse.ok) {
        const prevData = await prevResponse.json()
        setPreviousAnalytics(prevData.summary)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [storeId, dateRange, getDateRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Calculate percentage change
  const getChange = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'notified':
        return 'bg-blue-100 text-blue-700'
      case 'accepted':
        return 'bg-green-100 text-green-700'
      case 'processing':
        return 'bg-purple-100 text-purple-700'
      case 'shipped':
        return 'bg-indigo-100 text-indigo-700'
      case 'delivered':
        return 'bg-green-100 text-green-700'
      case 'declined':
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'qr':
        return <QrCode className="h-4 w-4" />
      case 'nfc':
        return <Smartphone className="h-4 w-4" />
      case 'link':
        return <Globe className="h-4 w-4" />
      default:
        return <QrCode className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-7 w-36" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-[140px] rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Chart Skeleton */}
          <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-end gap-1">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className="flex-1">
                    <Skeleton 
                      className="w-full rounded-t" 
                      style={{ height: `${Math.random() * 60 + 20}%` }} 
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1">
                  <Skeleton className="w-3 h-3 rounded" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="w-3 h-3 rounded" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products Skeleton */}
          <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-5" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-full max-w-[150px]" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-16 ml-auto" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Tables Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Scans Skeleton */}
          <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-28" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders Skeleton */}
          <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-36" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const summary = analytics?.summary || {
    total_scans: 0,
    unique_scanners: 0,
    total_conversions: 0,
    total_revenue: 0,
    conversion_rate: 0,
    avg_order_value: 0,
  }

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#F4610B] to-orange-400 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
            <p className="text-xs text-gray-500">Real-time gift code metrics</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] rounded-xl border-gray-200 bg-white shadow-sm">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchAnalytics}
            className="rounded-xl h-10 w-10 border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.08)] border-0 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Scans</p>
                <p className="text-3xl font-bold mt-2">{summary.total_scans.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {summary.unique_scanners.toLocaleString()} unique visitors
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors duration-300">
                <QrCode className="h-5 w-5 text-[#F4610B]" />
              </div>
            </div>
            {previousAnalytics && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <ChangeIndicator 
                  change={getChange(summary.total_scans, previousAnalytics.total_scans)} 
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversions */}
        <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.08)] border-0 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gifts Sent</p>
                <p className="text-3xl font-bold mt-2">{summary.total_conversions.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {summary.conversion_rate.toFixed(1)}% conversion rate
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors duration-300">
                <Gift className="h-5 w-5 text-pink-500" />
              </div>
            </div>
            {previousAnalytics && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <ChangeIndicator 
                  change={getChange(summary.total_conversions, previousAnalytics.total_conversions)} 
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.08)] border-0 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gift Revenue</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.total_revenue)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  from in-store gifts
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors duration-300">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
            {previousAnalytics && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <ChangeIndicator 
                  change={getChange(summary.total_revenue, previousAnalytics.total_revenue)} 
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avg Order Value */}
        <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.08)] border-0 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Gift Value</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.avg_order_value)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  per gift order
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors duration-300">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            {previousAnalytics && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <ChangeIndicator 
                  change={getChange(summary.avg_order_value, previousAnalytics.avg_order_value)} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart (Simple bar representation) */}
        <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="text-base">Daily Scans & Conversions</CardTitle>
            <CardDescription>Activity over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end gap-1">
              {(analytics?.daily || []).slice(-14).map((day, index) => {
                const maxScans = Math.max(...(analytics?.daily || []).map(d => d.scans), 1)
                const scanHeight = (day.scans / maxScans) * 100
                const convHeight = (day.conversions / maxScans) * 100
                
                return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-[#F4610B]/20 rounded-t relative"
                            style={{ height: `${scanHeight}%`, minHeight: '4px' }}
                          >
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-[#F4610B] rounded-t"
                              style={{ height: `${convHeight}%`, minHeight: day.conversions > 0 ? '4px' : '0' }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p className="font-semibold">{new Date(day.date).toLocaleDateString()}</p>
                          <p>{day.scans} scans</p>
                          <p>{day.conversions} gifts</p>
                          <p>{formatCurrency(day.revenue)}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-[#F4610B]/20" />
                <span>Scans</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-[#F4610B]" />
                <span>Conversions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Gifted Products */}
        <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="text-base">Top Gifted Products</CardTitle>
            <CardDescription>Most popular items sent as gifts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics?.top_products || []).slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-400 w-5">
                    #{index + 1}
                  </span>
                  {product.image_url ? (
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={product.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(product.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{product.gift_count} gifts</p>
                    <p className="text-xs text-gray-500">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
              
              {(!analytics?.top_products || analytics.top_products.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No gift data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scans */}
        <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analytics?.recent_scans || []).map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {scan.code?.product?.image_url ? (
                          <div className="relative h-8 w-8 rounded overflow-hidden bg-gray-100">
                            <Image
                              src={scan.code.product.image_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                            <Package className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium truncate max-w-[120px]">
                            {scan.code?.product?.name_en || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{scan.code?.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getSourceIcon(scan.scan_source)}
                        <span className="ml-1">{scan.scan_source}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {scan.converted ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Converted
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-gray-500">
                      {new Date(scan.scanned_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
                  </TableRow>
                ))}
                
                {(!analytics?.recent_scans || analytics.recent_scans.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                      <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No scans yet</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Gift Orders */}
        <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Recent Gift Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analytics?.recent_orders || []).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.product?.image_url ? (
                          <div className="relative h-8 w-8 rounded overflow-hidden bg-gray-100">
                            <Image
                              src={order.product.image_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                            <Gift className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium truncate max-w-[100px]">
                            {order.product?.name_en || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{order.order_number}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-[#F4610B]">
                        @{order.recipient_username}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs capitalize", getStatusColor(order.status))}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                  </TableRow>
                ))}
                
                {(!analytics?.recent_orders || analytics.recent_orders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                      <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No gift orders yet</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Change Indicator Component
function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) return null
  
  const isPositive = change >= 0
  
  return (
    <div className={cn(
      "inline-flex items-center text-xs font-medium px-2 py-1 rounded-full",
      isPositive 
        ? "text-green-700 bg-green-50" 
        : "text-red-700 bg-red-50"
    )}>
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3 mr-1" />
      ) : (
        <ArrowDownRight className="h-3 w-3 mr-1" />
      )}
      {Math.abs(change).toFixed(1)}% vs prev
    </div>
  )
}
