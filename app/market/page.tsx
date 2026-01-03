'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { Search, Star, Clock, MapPin, Store, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface StoreData {
  id: string
  name: string
  name_ar?: string
  slug?: string
  logo_url?: string
  description?: string
}

// Demo stores to show alongside real stores
const DEMO_STORES: StoreData[] = [
  { id: 'demo-1', name: 'Sweet Delights', description: 'Premium chocolates and sweets for every occasion' },
  { id: 'demo-2', name: 'Flower Paradise', description: 'Beautiful bouquets and floral arrangements' },
  { id: 'demo-3', name: 'Tech Gadgets', description: 'Latest electronics and accessories' },
  { id: 'demo-4', name: 'Fashion Hub', description: 'Trendy clothing and accessories' },
  { id: 'demo-5', name: 'Home Essentials', description: 'Quality home decor and furnishings' },
  { id: 'demo-6', name: 'Beauty Corner', description: 'Skincare, makeup, and wellness products' },
]

export default function MarketHomePage() {
  const [stores, setStores] = useState<StoreData[]>([])
  const [userStoreId, setUserStoreId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchStores() {
      try {
        // First, try to get the current user's store
        const { data: { user } } = await supabase.auth.getUser()
        let currentUserStoreId: string | null = null
        let userStore: StoreData | null = null
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('business_profile')
            .select('store_id')
            .eq('auth_user_id', user.id)
            .maybeSingle()
          
          if (profileError) {
            console.log('Profile fetch error:', profileError.message)
          }
          
          console.log('Profile data:', profile)
          
          if (profile?.store_id) {
            currentUserStoreId = profile.store_id
            setUserStoreId(profile.store_id)
            
            // Fetch the user's store directly
            const { data: storeData, error: storeError } = await supabase
              .from('stores')
              .select('id, name, name_ar, slug, logo_url, description')
              .eq('id', profile.store_id)
              .single()
            
            if (storeError) {
              console.log('Store fetch error:', storeError.message)
            }
            
            if (storeData) {
              userStore = storeData
              console.log('User store found:', storeData.name)
            }
          } else {
            console.log('No store_id in profile')
          }
        } else {
          console.log('No user logged in')
        }
        
        // Build the stores list - start with user's store
        const allStores: StoreData[] = []
        
        // Add user's store first if we have it
        if (userStore) {
          allStores.push(userStore)
        }
        
        // Try to fetch all stores (may fail due to RLS)
        try {
          const { data, error } = await supabase
            .from('stores')
            .select('id, name, name_ar, slug, logo_url, description')
            .order('created_at', { ascending: false })
            .limit(50)
          
          if (!error && data && data.length > 0) {
            // Add other stores (excluding user's store to avoid duplicates)
            const otherStores = currentUserStoreId 
              ? data.filter(s => s.id !== currentUserStoreId)
              : data
            allStores.push(...otherStores)
          }
        } catch (e) {
          // RLS may block reading other stores - that's okay, we still have user's store
          console.log('Could not fetch all stores (RLS may be blocking)')
        }
        
        setStores(allStores)
      } catch (err) {
        console.error('Error in fetchStores:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStores()
  }, [])

  // Combine real stores with demo stores for display
  const allStores = stores.length > 0 ? stores : []
  const displayStores = searchQuery 
    ? allStores.filter(store => store.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [...allStores, ...DEMO_STORES.slice(0, Math.max(0, 8 - allStores.length))]
  
  const filteredStores = displayStores

  return (
    <div className="min-h-screen bg-sidebar">
      {/* Header */}
      <header className="sticky top-0 z-[60] bg-white border-b border-gray-100 shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/market">
              <Image
                src={HAADY_LOGO_URL}
                alt="Haady"
                width={44}
                height={44}
                className="shrink-0"
              />
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stores..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F4610B]/20 focus:border-[#F4610B] transition-all"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard"
                className="px-4 py-2 bg-[#F4610B] text-white text-sm font-medium rounded-xl hover:bg-[#d9560a] transition-colors shadow-sm"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <MapPin className="w-4 h-4" />
            <span>Riyadh, Saudi Arabia</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Discover Gift Stores
          </h1>
          <p className="text-gray-500 max-w-xl">
            Browse local stores and find the perfect gifts for your loved ones.
          </p>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#F4610B] text-white rounded-xl text-sm font-medium whitespace-nowrap shadow-sm">
              All Stores
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium whitespace-nowrap hover:bg-gray-100 transition-colors border border-gray-200">
              <Sparkles className="w-4 h-4" />
              Featured
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium whitespace-nowrap hover:bg-gray-100 transition-colors border border-gray-200">
              <Star className="w-4 h-4" />
              Top Rated
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium whitespace-nowrap hover:bg-gray-100 transition-colors border border-gray-200">
              <Clock className="w-4 h-4" />
              New
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-gray-500">{filteredStores.length} stores available</span>
        </div>

        {/* Stores Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 animate-pulse">
                <div className="h-28 bg-gray-100" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl -mt-8" />
                    <div className="flex-1 pt-1">
                      <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStores.map((store) => {
              const isDemo = store.id.startsWith('demo-')
              const isYourStore = !isDemo && store.id === userStoreId
              
              return (
              <Link
                key={store.id}
                href={isDemo ? '#' : `/market/${store.slug || store.id}`}
                onClick={isDemo ? (e) => e.preventDefault() : undefined}
                className={cn(
                  "group bg-white rounded-2xl overflow-hidden border transition-all duration-300",
                  isDemo 
                    ? "border-gray-200 cursor-not-allowed grayscale opacity-50" 
                    : "shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-gray-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-gray-200 cursor-pointer hover:-translate-y-1"
                )}
              >
                {/* Banner */}
                <div className={cn(
                  "h-28 relative overflow-hidden",
                  isDemo ? "bg-gray-100" : "bg-gradient-to-br from-orange-50 to-pink-50"
                )}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      isDemo ? "bg-gray-200" : "bg-white/60"
                    )}>
                      <Store className={cn(
                        "w-6 h-6",
                        isDemo ? "text-gray-400" : "text-[#F4610B]/40"
                      )} />
                    </div>
                  </div>
                  {/* Badges */}
                  {isYourStore && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-[#F4610B] text-white text-[10px] font-bold rounded-full">
                      Your Store
                    </div>
                  )}
                  {isDemo && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-gray-400 text-white text-[10px] font-bold rounded-full">
                      Demo
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-3 pb-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    {/* Logo */}
                    <div className={cn(
                      "flex aspect-square w-12 items-center justify-center rounded-xl shrink-0 overflow-hidden relative border -mt-7",
                      isDemo 
                        ? "border-gray-200 bg-gray-100" 
                        : "border-gray-200 bg-white shadow-sm"
                    )}>
                      {store.logo_url && !isDemo ? (
                        <Image src={store.logo_url} alt={store.name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <Store className={cn(
                          "w-5 h-5",
                          isDemo ? "text-gray-400" : "text-[#F4610B]"
                        )} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {isDemo ? (
                        <>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1.5 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold text-foreground truncate group-hover:text-[#F4610B] transition-colors text-sm">
                            {store.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              4.8
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              20-30 min
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {isDemo ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
                    </div>
                  ) : store.description ? (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {store.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            )})}
          
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No stores found</h3>
            <p className="text-sm text-gray-500">Try a different search term</p>
          </div>
        )}
      </main>
    </div>
  )
}
