'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link as LinkIcon, Loader2, Store } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useLocale } from '@/i18n/context'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'

const ECOMMERCE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce'

// Platform definitions
const platforms = [
  {
    id: 'salla',
    name: 'Salla',
    nameAr: 'سلة',
    logo: `${ECOMMERCE_STORAGE_URL}/salla-icon.png`,
    description: 'Connect your Salla store',
    descriptionAr: 'اربط متجر سلة الخاص بك',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    nameAr: 'شوبيفاي',
    logo: `${ECOMMERCE_STORAGE_URL}/shopify-icon.png`,
    description: 'Connect your Shopify store',
    descriptionAr: 'اربط متجر شوبيفاي الخاص بك',
  },
  {
    id: 'zid',
    name: 'Zid',
    nameAr: 'زد',
    logo: `${ECOMMERCE_STORAGE_URL}/zid-icon.png`,
    description: 'Connect your Zid store',
    descriptionAr: 'اربط متجر زد الخاص بك',
  },
]

interface ConnectStoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ConnectStoreModal({
  open,
  onOpenChange,
  onSuccess,
}: ConnectStoreModalProps) {
  const { locale, isRTL } = useLocale()
  const [user, setUser] = useState<any>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [shopDomain, setShopDomain] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (err) {
        console.error('Error getting user:', err)
      }
    }
    getUser()
  }, [])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedPlatform(null)
      setShopDomain('')
      setIsConnecting(false)
    }
  }, [open])

  const handlePlatformSelect = (platformId: string) => {
    if (platformId === 'shopify') {
      setSelectedPlatform('shopify')
    } else {
      // For OAuth platforms (Salla, Zid), trigger OAuth flow directly
      if (platformId === 'salla') {
        handleSallaClick()
      } else if (platformId === 'zid') {
        handleZidClick()
      }
    }
  }

  const handleSallaClick = () => {
    const clientId = process.env.NEXT_PUBLIC_SALLA_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_SALLA_REDIRECT_URI || `${window.location.origin}/callback`
    
    if (!clientId) {
      toast.error(locale === 'ar' ? 'Salla OAuth غير مُكوّن' : 'Salla OAuth not configured')
      return
    }

    if (!user?.id) {
      toast.error(locale === 'ar' ? 'المستخدم غير مصادق عليه' : 'User not authenticated')
      return
    }

    const scopes = ['offline_access'].join(' ')
    const state = `${user.id}:salla:dashboard`

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
    })

    const authUrl = `https://accounts.salla.sa/oauth2/auth?${params.toString()}`
    window.location.href = authUrl
  }

  const handleZidClick = () => {
    const clientId = process.env.NEXT_PUBLIC_ZID_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_ZID_REDIRECT_URI || `${window.location.origin}/callback`
    
    if (!clientId) {
      toast.error(locale === 'ar' ? 'Zid OAuth غير مُكوّن' : 'Zid OAuth not configured')
      return
    }

    if (!user?.id) {
      toast.error(locale === 'ar' ? 'المستخدم غير مصادق عليه' : 'User not authenticated')
      return
    }

    const scopes = [
      'account.read',
      'products.read',
      'products.write',
      'product_inventory_stock.read',
      'product_inventory_stock.write',
      'orders.read',
      'orders.write',
      'abandoned_carts.read',
      'categories.read',
      'inventory.read',
      'inventory.write',
    ].join(' ')

    const state = `${user.id}:zid:dashboard`

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
    })

    const authUrl = `https://oauth.zid.sa/oauth/authorize?${params.toString()}`
    window.location.href = authUrl
  }

  const handleShopifyConnect = () => {
    if (!shopDomain.trim()) {
      toast.error(locale === 'ar' ? 'يرجى إدخال اسم المتجر' : 'Please enter your shop domain')
      return
    }

    const clientId = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_SHOPIFY_REDIRECT_URI || `${window.location.origin}/callback`
    
    if (!clientId) {
      toast.error(locale === 'ar' ? 'Shopify OAuth غير مُكوّن' : 'Shopify OAuth not configured')
      return
    }

    if (!user?.id) {
      toast.error(locale === 'ar' ? 'المستخدم غير مصادق عليه' : 'User not authenticated')
      return
    }

    // Clean shop domain
    let cleanShop = shopDomain.trim().replace(/\.myshopify\.com$/, '').replace(/^https?:\/\//, '')
    cleanShop = cleanShop.replace(/\/$/, '')

    const scopes = [
      'read_products',
      'write_products',
      'read_orders',
      'write_orders',
      'read_inventory',
      'write_inventory',
    ].join(',')

    const state = `${user.id}:shopify:dashboard:${cleanShop}`

    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state,
    })

    const authUrl = `https://${cleanShop}.myshopify.com/admin/oauth/authorize?${params.toString()}`
    window.location.href = authUrl
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {locale === 'ar' ? 'ربط متجر خارجي' : 'Connect External Store'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'ar' 
              ? 'اربط متجرك الخارجي لاستيراد المنتجات والطلبات تلقائيًا'
              : 'Connect your external store to automatically import products and orders'}
          </DialogDescription>
        </DialogHeader>

        {!selectedPlatform ? (
          // Platform selection
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformSelect(platform.id)}
                  className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-[#F4610B] hover:bg-orange-50 transition-all group"
                >
                  <div className="relative w-16 h-16 mb-4">
                    <Image
                      src={platform.logo}
                      alt={platform.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#F4610B] transition-colors mb-1">
                    {locale === 'ar' ? platform.nameAr : platform.name}
                  </h3>
                  <p className="text-sm text-gray-500 text-center">
                    {locale === 'ar' ? platform.descriptionAr : platform.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : selectedPlatform === 'shopify' ? (
          // Shopify shop domain input
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopDomain">
                {locale === 'ar' ? 'اسم المتجر' : 'Shop Domain'}
              </Label>
              <Input
                id="shopDomain"
                type="text"
                placeholder={locale === 'ar' ? 'my-shop' : 'my-shop.myshopify.com'}
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-gray-500">
                {locale === 'ar' 
                  ? 'أدخل اسم متجر Shopify الخاص بك (مثال: my-shop)'
                  : 'Enter your Shopify shop name (e.g., my-shop)'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedPlatform(null)}
                className="flex-1"
              >
                {locale === 'ar' ? 'رجوع' : 'Back'}
              </Button>
              <Button
                onClick={handleShopifyConnect}
                disabled={!shopDomain.trim() || isConnecting}
                className="flex-1 bg-[#F4610B] hover:bg-[#F4610B]/90"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {locale === 'ar' ? 'جاري الاتصال...' : 'Connecting...'}
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    {locale === 'ar' ? 'اتصل' : 'Connect'}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            {locale === 'ar' 
              ? 'بعد الاتصال، سيتم استيراد منتجاتك وطلباتك تلقائيًا من المتجر الخارجي.'
              : 'After connecting, your products and orders will be automatically imported from the external store.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

