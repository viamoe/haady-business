'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { 
  ChevronLeft, Share2, ShoppingBag, Star, Plus, Minus, 
  Gift, Truck, Shield, QrCode, Check, Package, Store
} from 'lucide-react'
import { Heart } from '@/components/animate-ui/icons/heart'
import { cn } from '@/lib/utils'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'
import { Badge } from '@/components/ui/badge'

interface Product {
  id: string
  name_en: string
  name_ar?: string
  description_en?: string
  description_ar?: string
  price: number
  compare_at_price?: number
  image_url?: string
  sku?: string
  barcode?: string
  qr_code?: string
  is_available: boolean
  store_id: string
}

interface StoreData {
  id: string
  name: string
  slug?: string
  logo_url?: string
  country?: string
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

export default function ProductPage({ params }: { params: Promise<{ storename: string; productId: string }> }) {
  const { storename, productId } = use(params)
  const router = useRouter()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [store, setStore] = useState<StoreData | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
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
    async function fetchProductData() {
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()
      
      if (productData) {
        setProduct(productData)
        
        const { data: storeData } = await supabase
          .from('stores')
          .select('id, name, slug, logo_url, country')
          .eq('id', productData.store_id)
          .single()
        
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
        }
      }
      
      setIsLoading(false)
    }
    
    fetchProductData()
  }, [productId])

  const handleAddToCart = () => {
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#F4610B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-sidebar">
        <header className="sticky top-0 z-[60] bg-white border-b border-gray-100 shadow-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            </div>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center py-32 text-center px-8">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Product not found</h2>
          <p className="text-sm text-gray-500 mb-6">This product doesn't exist or has been removed.</p>
          <button 
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-[#F4610B] text-white rounded-xl font-medium hover:bg-[#d9560a] transition-colors text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0

  return (
    <div className="min-h-screen bg-sidebar">
      {/* Header */}
      <header className="sticky top-0 z-[60] bg-white border-b border-gray-100 shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-500 hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Back</span>
              </button>
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

            <div className="flex items-center gap-2">
              {product.qr_code && (
                <button 
                  onClick={() => setShowQR(!showQR)}
                  className="p-2 text-gray-400 hover:text-foreground hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              )}
              <button className="p-2 text-gray-400 hover:text-foreground hover:bg-gray-100 rounded-xl transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsFavorite(!isFavorite)}
                className={cn(
                  "p-2 rounded-xl transition-colors [&_path]:transition-colors",
                  isFavorite 
                    ? 'text-red-500 bg-red-50 [&_path]:fill-red-500' 
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50 [&_path]:fill-gray-300 hover:[&_path]:fill-red-500'
                )}
              >
                <Heart size={20} variant="fill" animateOnHover />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* QR Code Modal */}
      {showQR && product.qr_code && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-8" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)]" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-center text-lg mb-1">Scan to Gift</h3>
            <p className="text-center text-gray-500 text-sm mb-5">Share this product with a friend</p>
            <div className="bg-gray-50 rounded-xl p-5 flex items-center justify-center">
              <Image 
                src={`/api/barcode?value=${encodeURIComponent(product.qr_code)}&type=QR&scale=6`}
                alt="QR Code"
                width={180}
                height={180}
              />
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              Scan with the Haady app to send as a gift
            </p>
            <button 
              onClick={() => setShowQR(false)}
              className="w-full mt-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-4 lg:sticky lg:top-24 self-start">
            <div className="aspect-square rounded-xl bg-gray-50 overflow-hidden relative">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name_en} fill className="object-contain p-4" sizes="(max-width: 768px) 100vw, 50vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-200" />
                </div>
              )}
              
              {discount > 0 && (
                <Badge className="absolute top-3 left-3 bg-red-500 text-white border-0 text-xs px-2 py-1">
                  {discount}% OFF
                </Badge>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div>
            {/* Store Badge */}
            {store && (
              <Link 
                href={`/market/${store?.slug || store?.id || storename}`}
                className="inline-flex items-center gap-2 mb-4 bg-gray-50 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                <div className={cn(
                  "flex aspect-square w-6 items-center justify-center rounded-lg shrink-0 overflow-hidden relative border border-gray-200 bg-white",
                )}>
                  {store.logo_url ? (
                    <Image src={store.logo_url} alt={store.name} fill className="object-cover" sizes="24px" />
                  ) : (
                    <Store className="w-3 h-3 text-[#F4610B]" />
                  )}
                </div>
                <span className="text-sm text-foreground font-medium">{store.name}</span>
              </Link>
            )}

            {/* Product Name */}
            <h1 className="text-2xl font-bold text-foreground mb-3">{product.name_en}</h1>
            
            {/* Rating */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={cn("w-4 h-4", star <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200')} />
                ))}
              </div>
              <span className="text-sm text-gray-500">4.0 (128 reviews)</span>
            </div>

            {/* Price */}
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-4 mb-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground flex items-center gap-1.5">
                  <img 
                    src={currencySrc} 
                    alt="currency" 
                    className="h-6 w-6 inline-block object-contain"
                    onError={() => setImageError(true)}
                  />
                  {product.price?.toFixed(2)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-lg text-gray-400 line-through flex items-center gap-1">
                    <img 
                      src={currencySrc} 
                      alt="currency" 
                      className="h-4 w-4 inline-block object-contain opacity-50"
                    />
                    {product.compare_at_price.toFixed(2)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  You save 
                  <img 
                    src={currencySrc} 
                    alt="currency" 
                    className="h-3.5 w-3.5 inline-block object-contain"
                  />
                  {(product.compare_at_price! - product.price).toFixed(2)}
                </p>
              )}
            </div>

            {/* Description */}
            {product.description_en && (
              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-4 mb-5">
                <h3 className="font-semibold text-foreground mb-2 text-sm">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description_en}</p>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Gift className="w-6 h-6 text-[#F4610B] mx-auto mb-1.5" />
                <span className="text-xs text-gray-700 font-medium">Gift Wrap</span>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Truck className="w-6 h-6 text-blue-500 mx-auto mb-1.5" />
                <span className="text-xs text-gray-700 font-medium">Fast Delivery</span>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Shield className="w-6 h-6 text-green-500 mx-auto mb-1.5" />
                <span className="text-xs text-gray-700 font-medium">Guaranteed</span>
              </div>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2 py-1.5 border border-gray-200">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <button 
                  onClick={handleAddToCart}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm",
                    addedToCart 
                      ? 'bg-green-500 text-white' 
                      : 'bg-[#F4610B] hover:bg-[#d9560a] text-white shadow-sm'
                  )}
                >
                  {addedToCart ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added to Gift Bag
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Add to Gift - 
                      <img 
                        src={currencySrc} 
                        alt="currency" 
                        className="h-4 w-4 inline-block object-contain brightness-0 invert"
                      />
                      {(product.price * quantity).toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SKU */}
            {product.sku && (
              <p className="text-xs text-gray-400 mt-4">SKU: {product.sku}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
