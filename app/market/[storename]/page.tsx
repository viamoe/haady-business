'use client'

import { useEffect, useState, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Search, Star, MapPin, Clock, ChevronLeft, Share2, ShoppingBag, Store, Package, Plus } from 'lucide-react'
import { Heart } from '@/components/animate-ui/icons/heart'
import { cn } from '@/lib/utils'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface StoreData {
  id: string
  name: string
  name_ar?: string
  slug?: string
  logo_url?: string
  description?: string
  rating?: number
  review_count?: number
}

interface Product {
  id: string
  name_en: string
  name_ar?: string
  price: number
  compare_at_price?: number
  image_url?: string
  is_available: boolean
}

interface Category {
  id: string
  name_en: string
  name_ar?: string
  image_url?: string
}

// Helper to generate fallback SVG as data URI
const getFallbackSVG = (symbol: string) => {
  const escapedSymbol = symbol
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><text x="12" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" text-anchor="middle" fill="currentColor" dominant-baseline="middle">${escapedSymbol}</text></svg>`
  
  if (typeof window !== 'undefined' && window.btoa) {
    try {
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    } catch {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    }
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function StorePage({ params }: { params: Promise<{ storename: string }> }) {
  const { storename } = use(params)
  
  const [store, setStore] = useState<StoreData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currencyIcon, setCurrencyIcon] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  // Currency display logic
  const isValidUrl = currencyIcon && (currencyIcon.startsWith('http://') || currencyIcon.startsWith('https://'))
  const isProblematicUrl = isValidUrl && currencyIcon.includes('sama.gov.sa')
  const fallbackSymbol = currencyIcon && !isValidUrl ? currencyIcon : 'SAR'
  const fallbackDataUri = getFallbackSVG(fallbackSymbol)
  const currencySrc = isValidUrl && !isProblematicUrl && !imageError
    ? `/api/currency-icon?url=${encodeURIComponent(currencyIcon)}`
    : fallbackDataUri

  useEffect(() => {
    async function fetchStoreData() {
      // Try to fetch store by slug first
      let { data: storeData } = await supabase
        .from('stores')
        .select('*, country')
        .eq('slug', storename)
        .maybeSingle()
      
      // If not found by slug, try by ID (if it looks like a UUID)
      if (!storeData && storename.includes('-') && storename.length > 30) {
        const { data } = await supabase
          .from('stores')
          .select('*, country')
          .eq('id', storename)
          .maybeSingle()
        storeData = data
      }
      
      // If still not found, try by name
      if (!storeData) {
        const { data } = await supabase
          .from('stores')
          .select('*, country')
          .ilike('name', `%${storename}%`)
          .maybeSingle()
        storeData = data
      }
      
      if (storeData) {
        setStore(storeData)
        
        // Fetch currency icon from country
        if (storeData.country) {
          const { data: countryData } = await supabase
            .from('countries')
            .select('currency_icon')
            .eq('id', storeData.country)
            .maybeSingle()
          
          if (countryData?.currency_icon) {
            setCurrencyIcon(countryData.currency_icon)
          }
        }
        
        // Fetch products
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name_en, name_ar, price, compare_at_price, image_url, is_available')
          .eq('store_id', storeData.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (productsData) {
          setProducts(productsData)
        }

        // Fetch categories
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name_en, name_ar, image_url')
          .eq('level', 1)
          .limit(8)
        
        if (categoriesData) {
          setCategories(categoriesData)
        }
      }
      
      setIsLoading(false)
    }
    
    fetchStoreData()
  }, [storename])

  const filteredProducts = products.filter(product =>
    product.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#F4610B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-sidebar">
        <header className="sticky top-0 z-[60] bg-white border-b border-gray-100 shadow-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/market" className="flex items-center gap-2 text-gray-500 hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span>Back to Market</span>
              </Link>
            </div>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center py-32 text-center px-8">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Store not found</h2>
          <p className="text-sm text-gray-500 mb-6">The store "{storename}" doesn't exist or is not available.</p>
          <Link href="/market" className="px-5 py-2.5 bg-[#F4610B] text-white rounded-xl font-medium hover:bg-[#d9560a] transition-colors text-sm">
            Browse Stores
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sidebar">
      {/* Header */}
      <header className="sticky top-0 z-[60] bg-white border-b border-gray-100 shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <Link href="/market" className="flex items-center gap-1 text-gray-500 hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Market</span>
              </Link>
              <div className="h-5 w-px bg-gray-200" />
              <Link href="/market" className="flex items-center gap-2">
                <Image
                  src={HAADY_LOGO_URL}
                  alt="Haady"
                  width={40}
                  height={40}
                  className="shrink-0"
                />
              </Link>
            </div>

            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search in ${store.name}...`}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F4610B]/20 focus:border-[#F4610B] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-foreground hover:bg-gray-100 rounded-xl transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Store Banner */}
      <div className="bg-white border-b border-gray-100">
        <div className="h-40 sm:h-52 bg-gradient-to-br from-orange-50 to-pink-50 relative">
        </div>

        {/* Store Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 pb-6">
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className={cn(
                "flex aspect-square w-20 items-center justify-center rounded-2xl shrink-0 overflow-hidden relative border-2 border-white bg-white shadow-md -mt-14",
              )}>
                {store.logo_url ? (
                  <Image src={store.logo_url} alt={store.name} fill className="object-cover" sizes="80px" />
                ) : (
                  <Store className="w-8 h-8 text-[#F4610B]" />
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">{store.name}</h1>
                {store.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{store.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{store.rating || '4.8'}</span>
                    ({store.review_count || '128'})
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    20-30 min
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Riyadh
                  </span>
                </div>
              </div>

              <div className="flex gap-6 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-gray-100 sm:pl-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{products.length}</div>
                  <div className="text-[10px] text-gray-500">Products</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button className="px-4 py-2 bg-[#F4610B] text-white rounded-xl text-sm font-medium whitespace-nowrap shadow-sm">
                All Products
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium whitespace-nowrap hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  {category.name_en}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-foreground">
            {searchQuery ? `Results for "${searchQuery}"` : 'All Products'}
          </h2>
          <span className="text-xs text-gray-500">{filteredProducts.length} products</span>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/market/${store?.slug || store?.id || storename}/product/${product.id}`}
                className="group bg-white rounded-3xl overflow-hidden transition-all duration-200 cursor-pointer relative"
              >
                {/* Image section with white background */}
                <div className="aspect-square bg-white m-2 rounded-3xl relative overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name_en}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Animated Heart icon */}
                  <button 
                    onClick={(e) => { e.preventDefault(); }}
                    className="absolute top-3 right-3 z-10 text-transparent hover:text-transparent transition-colors [&_path]:fill-gray-300 hover:[&_path]:fill-red-500 [&_path]:transition-colors [&_svg]:stroke-transparent"
                  >
                    <Heart size={24} variant="fill" animateOnHover />
                  </button>
                  
                  {/* Circular + button - black */}
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation();
                    }}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors z-10"
                  >
                    <Plus className="w-5 h-5" strokeWidth={2} />
                  </button>
                  
                  {/* Discount badge */}
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                      {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                    </div>
                  )}
                </div>

                {/* Text section - white background */}
                <div className="px-4 pb-4 pt-2">
                  {/* Price with currency icon */}
                  <div className="flex items-center gap-1 mb-1">
                    <img 
                      src={currencySrc} 
                      alt="currency" 
                      className="h-4 w-4 inline-block object-contain"
                      onError={() => setImageError(true)}
                    />
                    <span className="text-base font-bold text-foreground">
                      {product.price?.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Product name */}
                  <p className="text-sm text-gray-600 line-clamp-2 leading-snug">
                    {product.name_en}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-sm text-gray-500">
              {searchQuery ? 'Try a different search term' : 'This store hasn\'t added any products.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
