'use client'

import * as React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GiftCodeGenerator } from '@/components/gift-code-generator'
import { GiftAnalyticsDashboard } from '@/components/gift-analytics-dashboard'
import { QrCode, BarChart3, Gift } from 'lucide-react'
import { motion } from 'framer-motion'

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

export function GiftCodesContent() {
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [giftCodesCount, setGiftCodesCount] = useState(0)
  const [activeTab, setActiveTab] = useState('codes')
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])
  const [tabDimensions, setTabDimensions] = useState({ left: 0, width: 0 })

  const tabs = [
    { value: 'codes', label: 'Gift Codes', icon: QrCode, count: giftCodesCount },
    { value: 'analytics', label: 'Analytics', icon: BarChart3, count: null },
  ]

  // Update tab dimensions when active tab changes, loading finishes, or count changes
  useEffect(() => {
    if (loading) return
    
    const updateDimensions = () => {
      const activeIndex = activeTab === 'codes' ? 0 : 1
      const activeTabEl = tabsRef.current[activeIndex]
      
      if (activeTabEl) {
        setTabDimensions({
          left: activeTabEl.offsetLeft,
          width: activeTabEl.offsetWidth,
        })
      }
    }
    
    // Run after a short delay to ensure DOM is ready
    const timer = setTimeout(updateDimensions, 50)
    
    return () => clearTimeout(timer)
  }, [activeTab, loading, giftCodesCount])

  // Fetch store and products
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get business profile
      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!businessProfile) throw new Error('Business not found')

      // Get store
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('business_id', businessProfile.id)
        .limit(1)

      if (!stores || stores.length === 0) throw new Error('No stores found')
      setStoreId(stores[0].id)

      // Get products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name_en, name_ar, sku, price, image_url')
        .eq('store_id', stores[0].id)
        .eq('is_active', true)
        .order('name_en', { ascending: true })

      setProducts(productsData || [])

      // Get gift codes count
      const { count } = await supabase
        .from('gift_codes')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', stores[0].id)

      setGiftCodesCount(count || 0)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6 h-full flex flex-col min-h-0">
        {/* Page Header Skeleton */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex items-center rounded-xl bg-gray-100/80 p-1 relative w-fit">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg ml-1" />
        </div>

        {/* Gift Code Generator Section Skeleton */}
        <div className="space-y-6 flex-1 min-h-0">
          {/* Search and filters row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>

          {/* Gift Code Cards Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
                {/* Card Header */}
                <div className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
                
                {/* QR Code Preview */}
                <div className="px-4">
                  <Skeleton className="aspect-square rounded-2xl w-full" />
                </div>
                
                {/* Product Info */}
                <div className="p-4 pt-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
                
                {/* Footer Stats */}
                <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between pt-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!storeId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 h-full">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full blur-3xl" />
          <div className="relative bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8">
            <Gift className="h-16 w-16 text-[#F4610B]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-2">No Store Found</h2>
        <p className="text-gray-500 text-center max-w-md">
          Please create a store first to start creating gift codes for your products.
        </p>
        <Button className="mt-6 bg-[#F4610B] hover:bg-[#d54e09] rounded-xl">
          Create Store
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0">
      {/* Tabs wrapping everything */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        {/* Header with Tabs on the right */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">In-Store Gifting</h1>
            <p className="text-gray-500 mt-1">
              Create QR codes for customers to scan and send products as gifts
            </p>
          </div>
          <TabsList className="flex-shrink-0 gap-1 p-1 relative bg-transparent">
            {/* Animated background */}
            {tabDimensions.width > 0 && (
              <motion.div
                className="absolute h-[calc(100%-8px)] top-1 rounded-md bg-orange-50 dark:bg-orange-900/20"
                initial={{ left: tabDimensions.left, width: tabDimensions.width }}
                animate={{
                  left: tabDimensions.left,
                  width: tabDimensions.width,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8
                }}
              />
            )}
            {tabs.map((tab, index) => (
              <TabsTrigger 
                key={tab.value}
                ref={(el) => { tabsRef.current[index] = el }}
                value={tab.value} 
                className="flex items-center gap-2 px-4 relative z-10 text-muted-foreground hover:text-[#F4610B] transition-colors data-[state=active]:bg-transparent data-[state=active]:text-[#F4610B] data-[state=active]:shadow-none"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <div className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-md bg-[#F4610B] text-white text-[10px] font-bold tabular-nums">
                    {tab.count}
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="codes" className="mt-6 flex-1 min-h-0 flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <GiftCodeGenerator 
              storeId={storeId} 
              products={products}
              onCodeCreated={() => {
                // Refresh count when new code is created
                setGiftCodesCount(prev => prev + 1)
              }}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 flex-1 min-h-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GiftAnalyticsDashboard storeId={storeId} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
