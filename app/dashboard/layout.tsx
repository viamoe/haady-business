'use client'

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { StoreConnectionProvider } from '@/lib/store-connection-context'
import { OnboardingModalProvider, useOnboardingModal } from '@/lib/onboarding-modal-context'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { RefreshCcw } from '@/components/animate-ui/icons/refresh-ccw'
import { ICON_BUTTON_CLASSES, DEFAULT_ICON_SIZE } from '@/lib/ui-constants'
import { WideCardModal } from '@/components/ui/wide-card-modal'
import { useAuth } from '@/lib/auth/auth-context'
import { useStoreConnection } from '@/lib/store-connection-context'
import { useLocale } from '@/i18n/context'
import { toast } from '@/lib/toast'
import { safeFetch, handleError } from '@/lib/error-handler'
import Image from 'next/image'
import { Check, ArrowRight, ArrowLeft, Zap, CheckCircle2, Gift, MessageSquare, Mail, Bell, AlertCircle, Info, HelpCircle, User, ShoppingCart, Package, CreditCard, Settings as SettingsIcon, Shield, TrendingUp, Star, Loader2, Store, Copy, Pencil, Trash2, Upload, Image as ImageIcon, Minus, Languages } from 'lucide-react'
import { Plus } from '@/components/animate-ui/icons/plus'
import { MessageCircleQuestion } from '@/components/animate-ui/icons/message-circle-question'
import { Settings } from '@/components/animate-ui/icons/settings'
import { LogOut } from '@/components/animate-ui/icons/log-out'
import { Unplug } from '@/components/animate-ui/icons/unplug'
import { Sparkles } from '@/components/animate-ui/icons/sparkles'
import { supabase } from '@/lib/supabase/client'
import { CelebrationModal } from '@/components/celebration-modal'
// TODO: Wormmy removed - will be reimplemented with new architecture
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { NotificationDrawer } from '@/components/notification-drawer'
import { SearchModal } from '@/components/search-modal'
import { CreateStoreModal } from '@/components/create-store-modal'
// TODO: ProductApprovalModal removed - will be reimplemented with new architecture
import { Search } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'

const ECOMMERCE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce';

// Platform logos mapping (matching app-sidebar.tsx)
const PLATFORM_LOGOS: Record<string, string> = {
  salla: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/salla-icon.png',
  zid: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/zid.svg',
  shopify: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/shopify-icon.png',
};

// E-commerce platforms data
// ECOMMERCE_PLATFORMS will be created inside the component to use translations

function DashboardLayoutContentInner({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations()
  const { user, signOut } = useAuth()
  const { 
    store, 
    storeId: contextStoreId, 
    isLoadingStore,
    storeConnections: contextStoreConnections,
    selectedConnectionId, 
    isChangingStore, 
    selectedConnection, 
    setSelectedConnectionId,
    refreshStore 
  } = useStoreConnection()
  const { isRTL, locale } = useLocale()
  const { isOpen: isWelcomeModalOpen, open: openModal, close: closeModal, step: modalStep, setStep: setModalStep } = useOnboardingModal()
  const pageName = pathname.split('/').filter(Boolean).pop() || 'Dashboard'
  const capitalizedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1)
  
  // Get step from URL or default to 'choose'
  const urlStep = searchParams.get('step') as 'choose' | 'connect-platform' | null
  const [isCardHovered, setIsCardHovered] = useState(false)
  const [isCard2Hovered, setIsCard2Hovered] = useState(false)
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null)
  const [isSupportHover, setIsSupportHover] = useState(false)
  const [isSettingsHover, setIsSettingsHover] = useState(false)
  const [isLanguageHover, setIsLanguageHover] = useState(false)
  const [isLogoutHover, setIsLogoutHover] = useState(false)
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false)
  // TODO: isSyncing removed - will be reimplemented with new architecture
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [messagesCount, setMessagesCount] = useState(0)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false)
  const [isLogoUploadModalOpen, setIsLogoUploadModalOpen] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoZoom, setLogoZoom] = useState(100) // Zoom level in percentage (100 = 1x scale)
  const [isMac, setIsMac] = useState(false) // Default to false to match server render
  
  // Store info now comes from context - use derived values for backward compatibility
  const storeName = store?.name || null
  const storeNameAr = store?.name_ar || null
  const storeId = contextStoreId
  const storeLogoUrl = store?.logo_url || null
  
  // Transform context connections to match local format
  const storeConnections = contextStoreConnections.map(conn => ({
    id: conn.id,
    platform: conn.platform,
    store_name: conn.external_store_name || null,
    store_logo_url: null,
    logo_zoom: null,
  }))
  
  // Detect if user is on Mac (client-side only to avoid hydration mismatch)
  useEffect(() => {
    setIsMac(typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])
  
  // Handle keyboard shortcut to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchModalOpen(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMac])
  
  // E-commerce platforms with translations
  const ECOMMERCE_PLATFORMS = React.useMemo(() => [
    {
      id: 'salla',
      name: 'Salla',
      logo: `${ECOMMERCE_STORAGE_URL}/salla-logo.png`,
      description: t('onboarding.modal.platforms.salla.description'),
      features: [
        t('onboarding.modal.platforms.salla.features.autoSync'),
        t('onboarding.modal.platforms.salla.features.realTimeInventory'),
        t('onboarding.modal.platforms.salla.features.orderManagement')
      ],
    },
    {
      id: 'zid',
      name: 'Zid',
      logo: `${ECOMMERCE_STORAGE_URL}/zid-logo.png`,
      description: t('onboarding.modal.platforms.zid.description'),
      features: [
        t('onboarding.modal.platforms.zid.features.productImport'),
        t('onboarding.modal.platforms.zid.features.inventorySync'),
        t('onboarding.modal.platforms.zid.features.unifiedDashboard')
      ],
    },
    {
      id: 'shopify',
      name: 'Shopify',
      logo: `${ECOMMERCE_STORAGE_URL}/shopify-logo.png`,
      description: t('onboarding.modal.platforms.shopify.description'),
      features: [
        t('onboarding.modal.platforms.shopify.features.fullCatalogSync'),
        t('onboarding.modal.platforms.shopify.features.multiCurrency'),
        t('onboarding.modal.platforms.shopify.features.orderTracking')
      ],
    },
  ], [t])
  
  // Dummy updates data for testing with read/unread state - using translations
  const dummyUpdates = React.useMemo(() => [
    {
      id: '1',
      title: t('notifications.updatesList.1.title'),
      description: t('notifications.updatesList.1.description'),
      time: t('notifications.time.2hoursAgo'),
      icon: Zap,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      isRead: false,
    },
    {
      id: '2',
      title: t('notifications.updatesList.2.title'),
      description: t('notifications.updatesList.2.description'),
      time: t('notifications.time.1dayAgo'),
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      isRead: false,
    },
    {
      id: '3',
      title: t('notifications.updatesList.3.title'),
      description: t('notifications.updatesList.3.description'),
      time: t('notifications.time.3daysAgo'),
      icon: Gift,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      isRead: false,
    },
    {
      id: '4',
      title: t('notifications.updatesList.4.title'),
      description: t('notifications.updatesList.4.description'),
      time: t('notifications.time.5hoursAgo'),
      icon: Zap,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-50',
      isRead: false,
    },
    {
      id: '5',
      title: t('notifications.updatesList.5.title'),
      description: t('notifications.updatesList.5.description'),
      time: t('notifications.time.8hoursAgo'),
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      isRead: true,
    },
    {
      id: '6',
      title: t('notifications.updatesList.6.title'),
      description: t('notifications.updatesList.6.description'),
      time: t('notifications.time.12hoursAgo'),
      icon: CheckCircle2,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      isRead: true,
    },
    {
      id: '7',
      title: t('notifications.updatesList.7.title'),
      description: t('notifications.updatesList.7.description'),
      time: t('notifications.time.1dayAgo'),
      icon: Zap,
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-50',
      isRead: false,
    },
    {
      id: '8',
      title: t('notifications.updatesList.8.title'),
      description: t('notifications.updatesList.8.description'),
      time: t('notifications.time.2daysAgo'),
      icon: Gift,
      iconColor: 'text-pink-600',
      iconBg: 'bg-pink-50',
      isRead: true,
    },
    {
      id: '9',
      title: t('notifications.updatesList.9.title'),
      description: t('notifications.updatesList.9.description'),
      time: t('notifications.time.2daysAgo'),
      icon: CheckCircle2,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      isRead: true,
    },
    {
      id: '10',
      title: t('notifications.updatesList.10.title'),
      description: t('notifications.updatesList.10.description'),
      time: t('notifications.time.3daysAgo'),
      icon: Zap,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      isRead: false,
    },
    {
      id: '11',
      title: t('notifications.updatesList.11.title'),
      description: t('notifications.updatesList.11.description'),
      time: t('notifications.time.4daysAgo'),
      icon: CheckCircle2,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      isRead: true,
    },
    {
      id: '12',
      title: t('notifications.updatesList.12.title'),
      description: t('notifications.updatesList.12.description'),
      time: t('notifications.time.5daysAgo'),
      icon: Gift,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      isRead: true,
    },
    {
      id: '13',
      title: t('notifications.updatesList.13.title'),
      description: t('notifications.updatesList.13.description'),
      time: t('notifications.time.1weekAgo'),
      icon: Zap,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      isRead: true,
    },
    {
      id: '14',
      title: t('notifications.updatesList.14.title'),
      description: t('notifications.updatesList.14.description'),
      time: t('notifications.time.1weekAgo'),
      icon: CheckCircle2,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      isRead: false,
    },
    {
      id: '15',
      title: t('notifications.updatesList.15.title'),
      description: t('notifications.updatesList.15.description'),
      time: t('notifications.time.1weekAgo'),
      icon: Gift,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      isRead: true,
    },
  ], [t])
  
  // Dummy messages data for testing - using translations
  const dummyMessages = React.useMemo(() => [
    {
      id: 'm1',
      title: t('notifications.messagesList.m1.title'),
      description: t('notifications.messagesList.m1.description'),
      time: t('notifications.time.30minAgo'),
      icon: MessageSquare,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      isRead: false,
    },
    {
      id: 'm2',
      title: t('notifications.messagesList.m2.title'),
      description: t('notifications.messagesList.m2.description'),
      time: t('notifications.time.1hourAgo'),
      icon: Mail,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      isRead: false,
    },
    {
      id: 'm3',
      title: t('notifications.messagesList.m3.title'),
      description: t('notifications.messagesList.m3.description'),
      time: t('notifications.time.2hoursAgo'),
      icon: Bell,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      isRead: false,
    },
    {
      id: 'm4',
      title: t('notifications.messagesList.m4.title'),
      description: t('notifications.messagesList.m4.description'),
      time: t('notifications.time.3hoursAgo'),
      icon: Star,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-50',
      isRead: false,
    },
    {
      id: 'm5',
      title: t('notifications.messagesList.m5.title'),
      description: t('notifications.messagesList.m5.description'),
      time: t('notifications.time.5hoursAgo'),
      icon: AlertCircle,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      isRead: true,
    },
    {
      id: 'm6',
      title: t('notifications.messagesList.m6.title'),
      description: t('notifications.messagesList.m6.description'),
      time: t('notifications.time.6hoursAgo'),
      icon: Package,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      isRead: false,
    },
    {
      id: 'm7',
      title: t('notifications.messagesList.m7.title'),
      description: t('notifications.messagesList.m7.description'),
      time: t('notifications.time.8hoursAgo'),
      icon: Info,
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-50',
      isRead: true,
    },
    {
      id: 'm8',
      title: t('notifications.messagesList.m8.title'),
      description: t('notifications.messagesList.m8.description'),
      time: t('notifications.time.10hoursAgo'),
      icon: User,
      iconColor: 'text-pink-600',
      iconBg: 'bg-pink-50',
      isRead: false,
    },
    {
      id: 'm9',
      title: t('notifications.messagesList.m9.title'),
      description: t('notifications.messagesList.m9.description'),
      time: t('notifications.time.12hoursAgo'),
      icon: CreditCard,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      isRead: true,
    },
    {
      id: 'm10',
      title: t('notifications.messagesList.m10.title'),
      description: t('notifications.messagesList.m10.description'),
      time: t('notifications.time.1dayAgo'),
      icon: ShoppingCart,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      isRead: false,
    },
    {
      id: 'm11',
      title: t('notifications.messagesList.m11.title'),
      description: t('notifications.messagesList.m11.description'),
      time: t('notifications.time.1dayAgo'),
      icon: HelpCircle,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      isRead: true,
    },
    {
      id: 'm12',
      title: t('notifications.messagesList.m12.title'),
      description: t('notifications.messagesList.m12.description'),
      time: t('notifications.time.2daysAgo'),
      icon: Shield,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      isRead: true,
    },
    {
      id: 'm13',
      title: t('notifications.messagesList.m13.title'),
      description: t('notifications.messagesList.m13.description'),
      time: t('notifications.time.2daysAgo'),
      icon: TrendingUp,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      isRead: false,
    },
    {
      id: 'm14',
      title: t('notifications.messagesList.m14.title'),
      description: t('notifications.messagesList.m14.description'),
      time: t('notifications.time.3daysAgo'),
      icon: SettingsIcon,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      isRead: true,
    },
    {
      id: 'm15',
      title: t('notifications.messagesList.m15.title'),
      description: t('notifications.messagesList.m15.description'),
      time: t('notifications.time.1weekAgo'),
      icon: MessageSquare,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      isRead: true,
    },
  ], [t])
  
  // Handle update read status (optional callback)
  // Note: NotificationDrawer manages its own local state, so these are just callbacks
  const handleUpdateRead = (id: string) => {
    // NotificationDrawer handles its own state updates
  }
  
  // Handle mark all as read (optional callback)
  // Note: NotificationDrawer manages its own local state, so these are just callbacks
  const handleMarkAllAsRead = () => {
    // NotificationDrawer handles its own state updates
  }
  
  // TODO: syncPhrases removed - will be reimplemented with new architecture

  // Format relative time (e.g., "3 min ago", "1 hour ago")
  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return t('header.time.justNow')
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return t('header.time.minAgo', { count: diffInMinutes })
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return diffInHours === 1 
        ? t('header.time.hourAgo', { count: diffInHours })
        : t('header.time.hoursAgo', { count: diffInHours })
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return diffInDays === 1
        ? t('header.time.dayAgo', { count: diffInDays })
        : t('header.time.daysAgo', { count: diffInDays })
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) {
      return diffInWeeks === 1
        ? t('header.time.weekAgo', { count: diffInWeeks })
        : t('header.time.weeksAgo', { count: diffInWeeks })
    }
    
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return diffInMonths === 1
        ? t('header.time.monthAgo', { count: diffInMonths })
        : t('header.time.monthsAgo', { count: diffInMonths })
    }
    
    const diffInYears = Math.floor(diffInDays / 365)
    return diffInYears === 1
      ? t('header.time.yearAgo', { count: diffInYears })
      : t('header.time.yearsAgo', { count: diffInYears })
  }

  // Fetch last sync time from database
  const fetchLastSyncTime = useCallback(async () => {
    if (!selectedConnectionId || !user?.id) {
      setLastSyncTime(null)
      return
    }

    try {
      // RLS will automatically filter by user via stores -> business_profile
      const { data, error } = await supabase
        .from('store_connections')
        .select('last_sync_at')
        .eq('id', selectedConnectionId)
        .maybeSingle()

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching last sync time:', error)
        }
        return
      }

      if (data?.last_sync_at) {
        setLastSyncTime(new Date(data.last_sync_at))
      } else {
        setLastSyncTime(null)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Exception fetching last sync time:', error)
      }
    }
  }, [selectedConnectionId, user?.id])

  // Fetch last sync time when connection changes
  useEffect(() => {
    fetchLastSyncTime()
  }, [fetchLastSyncTime])

  // TODO: Sync event listeners removed - will be reimplemented with new architecture
  // Store info and connections now come from StoreConnectionProvider context

  // TODO: Sync functionality will be reimplemented with new architecture
  // handleSync, performDirectSync, and handleApproveProducts removed pending new implementation
  const [hasCheckedConnections, setHasCheckedConnections] = useState(false)
  const [hasManuallyOpened, setHasManuallyOpened] = useState(false)
  const [showShopifyDialog, setShowShopifyDialog] = useState(false)
  const [shopDomainInput, setShopDomainInput] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationPlatform, setCelebrationPlatform] = useState<string>('')
  const [celebrationStoreName, setCelebrationStoreName] = useState<string>('')
  const hasHandledSuccessRef = useRef(false)
  const celebrationWasShownRef = useRef(false) // Track if celebration was actually displayed

  // Listen for open modal event from sidebar
  useEffect(() => {
    const handleOpenModal = () => {
      // Mark as manually opening to prevent URL sync from overriding
      setHasManuallyOpened(true)
      // Reset to 'choose' step and clear any URL params
      setModalStep('choose')
      // Remove step from URL if present
      const url = new URL(window.location.href)
      url.searchParams.delete('step')
      router.replace(url.pathname + (url.search || ''), { scroll: false })
      // Open the modal
      openModal()
    }
    window.addEventListener('openOnboardingModal', handleOpenModal)
    return () => {
      window.removeEventListener('openOnboardingModal', handleOpenModal)
    }
  }, [openModal, setModalStep, router])

  // Sync modal step with URL (only if not manually opening via event)
  useEffect(() => {
    if (!hasManuallyOpened) {
      if (urlStep === 'connect-platform') {
        setModalStep('connect-platform')
        openModal()
      } else if (urlStep === 'choose') {
        setModalStep('choose')
        openModal()
      }
    }
  }, [urlStep, setModalStep, openModal, hasManuallyOpened])

  // Check if user has completed onboarding and has stores on mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id || hasCheckedConnections) return

      try {
        // Check if user has completed onboarding
        const { data: businessProfile, error: profileError } = await supabase
          .from('business_profile')
          .select('id, is_onboarded, onboarding_step, store_id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Error checking business profile:', profileError)
          setHasCheckedConnections(true)
          return
        }

        // If user has completed onboarding, don't show the modal
        const hasCompletedOnboarding = businessProfile && (
          businessProfile.is_onboarded || 
          businessProfile.onboarding_step === null
        )

        // If user has a store_id in business_profile, they have a store
        const hasStore = businessProfile?.store_id !== null

        // Don't show modal if:
        // 1. User has completed onboarding, OR
        // 2. User has a store (even without connections)
        if (hasCompletedOnboarding || hasStore) {
          setHasCheckedConnections(true)
          return
        }

        // Check if user has any stores (fallback check)
        const { data: stores, error: storesError } = await supabase
          .from('stores')
          .select('id')
          .eq('business_id', businessProfile?.id)
          .eq('is_active', true)
          .limit(1)

        if (storesError) {
          console.error('Error checking stores:', storesError)
          // If there's an error, don't show the modal
          setHasCheckedConnections(true)
          return
        }

        // Only show modal if user has no stores at all
        if (!stores || stores.length === 0) {
          openModal()
        }

        setHasCheckedConnections(true)
      } catch (error) {
        console.error('Exception checking onboarding status:', error)
        setHasCheckedConnections(true)
      }
    }

    checkOnboardingStatus()
  }, [user?.id, hasCheckedConnections, openModal])

  // Handle success/error messages from OAuth callback
  useEffect(() => {
    // Use window.location to read params directly to avoid useSearchParams issues
    if (typeof window === 'undefined') return
    if (hasHandledSuccessRef.current) return // Prevent multiple runs
    
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const message = urlParams.get('message')
    const storeName = urlParams.get('store')

    if (success === 'salla_connected' || success === 'zid_connected' || success === 'shopify_connected') {
      // Mark as handled to prevent re-running
      hasHandledSuccessRef.current = true
      
      let platform = 'salla'
      if (success === 'zid_connected') {
        platform = 'zid'
      } else if (success === 'salla_connected') {
        platform = 'salla'
      } else if (success === 'shopify_connected') {
        platform = 'shopify'
      }
      
      // Set celebration modal data
      setCelebrationPlatform(platform)
      setCelebrationStoreName(storeName || '')
      celebrationWasShownRef.current = true // Mark as intentionally shown
      setShowCelebration(true)
      
      // Close the onboarding modal on success
      closeModal()
      
      // Clean up URL params immediately (without reload)
      urlParams.delete('success')
      urlParams.delete('store')
      const currentPath = window.location.pathname
      const newUrl = urlParams.toString() ? `${currentPath}?${urlParams.toString()}` : currentPath
      window.history.replaceState({}, '', newUrl)
    }

    if (error === 'salla_connection_failed' || error === 'zid_connection_failed' || error === 'shopify_connection_failed') {
      let platformName = 'Store'
      if (error === 'zid_connection_failed') {
        platformName = 'Zid'
      } else if (error === 'salla_connection_failed') {
        platformName = 'Salla'
      } else if (error === 'shopify_connection_failed') {
        platformName = 'Shopify'
      }
      
      // Show toast
      toast.error(t('toast.error.failedToConnectStore', { platform: platformName }), {
        description: message || t('toast.error.failedToConnectStoreDesc'),
      })
      
      // Clean up URL params after a delay
      setTimeout(() => {
        urlParams.delete('error')
        urlParams.delete('message')
        const currentPath = window.location.pathname
        const newUrl = urlParams.toString() ? `${currentPath}?${urlParams.toString()}` : currentPath
        window.history.replaceState({}, '', newUrl)
      }, 500)
    }
  }, [closeModal]) // Keep closeModal in dependencies for consistency

  // Sync step state with URL when URL changes (browser back/forward)
  useEffect(() => {
    const urlStep = searchParams.get('step') as 'choose' | 'connect-platform' | null
    const newStep = urlStep === 'connect-platform' ? 'connect-platform' : 'choose'
    setModalStep(newStep)
  }, [searchParams, setModalStep])

  // Helper to update both state and URL
  const updateStep = (step: 'choose' | 'connect-platform') => {
    setModalStep(step)
    const params = new URLSearchParams(searchParams.toString())
    if (step === 'choose') {
      params.delete('step')
    } else {
      params.set('step', step)
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }

  const handleConnectStoreClick = () => {
    updateStep('connect-platform')
  }

  const handleBackToChoose = () => {
    updateStep('choose')
  }

  const handleSallaClick = () => {
    // 1. Configuration (From your Env Variables)
    const clientId = process.env.NEXT_PUBLIC_SALLA_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SALLA_REDIRECT_URI || "http://localhost:3002/callback";
    
    // 2. Define Permissions (Scopes)
    // Trying different scope names based on Salla Dashboard UI
    // "Basic Information" = settings.read (not store.read)
    // "Products" Read Only = products.read  
    // "Orders" Read and Write = orders.read_write
    const scopes = "settings.read products.read orders.read_write";

    // 3. Security State (include platform for callback routing)
    const state = `${user?.id}:salla`; 

    // 4. Construct the URL using URLSearchParams for proper encoding
    const params = new URLSearchParams({
      client_id: clientId || '',
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state || '',
    });

    const authUrl = `https://accounts.salla.sa/oauth2/auth?${params.toString()}`;

    // Debug: Log the URL to console
    console.log('Salla OAuth URL:', authUrl);
    console.log('Scopes:', scopes);
    console.log('Client ID:', clientId);

    // 5. Redirect to Salla
    window.location.href = authUrl;
  }

  const handleZidClick = () => {
    // 1. Configuration (From your Env Variables)
    const clientId = process.env.NEXT_PUBLIC_ZID_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_ZID_REDIRECT_URI || "http://localhost:3002/callback";
    
    if (!clientId) {
      toast.error(t('toast.error.zidClientIdNotConfigured'), {
        description: t('toast.error.zidClientIdNotConfiguredDesc'),
      });
      return;
    }

    if (!redirectUri || redirectUri.includes('localhost')) {
      toast.error(t('toast.error.invalidRedirectUri'), {
        description: t('toast.error.invalidRedirectUriDesc'),
      });
      return;
    }
    
    // 2. Define Permissions (Scopes) for Zid
    // Based on selected permissions in Zid Partner Dashboard:
    // - Account: Read
    // - Products: Read & Write
    // - Product Inventory Stock: Read & Write
    // - Orders: Read & Write
    // - Abandoned Carts: Read
    // - Categories: Read
    // - Inventory: Read & Write
    // 
    // Zid uses format: resource.action (e.g., products.read, orders.write)
    const scopes = [
      "account.read",                    // Account: Read
      "products.read",                    // Products: Read
      "products.write",                   // Products: Write
      "product_inventory_stock.read",     // Product Inventory Stock: Read
      "product_inventory_stock.write",    // Product Inventory Stock: Write
      "orders.read",                      // Orders: Read
      "orders.write",                     // Orders: Write
      "abandoned_carts.read",             // Abandoned Carts: Read
      "categories.read",                  // Categories: Read
      "inventory.read",                   // Inventory: Read
      "inventory.write"                   // Inventory: Write
    ].join(" ");

    // 3. Security State (include platform for callback routing)
    const state = `${user?.id}:zid`; 

    // 4. Construct the URL using URLSearchParams for proper encoding
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
    });

    const authUrl = `https://oauth.zid.sa/oauth/authorize?${params.toString()}`;

    // Debug: Log the URL to console (check these values!)
    console.log('🔵 Zid OAuth Configuration:');
    console.log('  Client ID:', clientId);
    console.log('  Redirect URI:', redirectUri);
    console.log('  Scopes:', scopes);
    console.log('  State:', state);
    console.log('  Full OAuth URL:', authUrl);
    console.log('');
    console.log('⚠️  Make sure the Redirect URI matches EXACTLY in Zid Partner Dashboard!');

    // 5. Redirect to Zid
    window.location.href = authUrl;
  }

  const handleShopifyClick = () => {
    // Open dialog to get shop domain
    setShopDomainInput('')
    setShowShopifyDialog(true)
  }

  const handleShopifyDialogSubmit = () => {
    const shopDomain = shopDomainInput.trim()
    
    if (!shopDomain) {
      toast.error(t('toast.error.shopDomainRequired'), {
        description: t('toast.error.shopDomainRequiredDesc'),
      })
      return
    }

    // Clean the shop domain (remove https://, trailing slashes, etc.)
    let cleanShop = shopDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .trim()

    // Remove .myshopify.com if user included it
    if (cleanShop.endsWith('.myshopify.com')) {
      cleanShop = cleanShop.replace(/\.myshopify\.com$/, '')
    }
    
    // Remove admin.shopify.com/store/ prefix if user pasted that URL
    if (cleanShop.includes('admin.shopify.com/store/')) {
      cleanShop = cleanShop.replace(/.*admin\.shopify\.com\/store\//, '')
    }

    // Validate shop domain (should be alphanumeric, hyphens, underscores only)
    if (!cleanShop || !/^[a-zA-Z0-9_-]+$/.test(cleanShop)) {
      toast.error(t('toast.error.invalidShopDomain'), {
        description: t('toast.error.invalidShopDomainDesc'),
      })
      return
    }

    // Close dialog and proceed with OAuth
    setShowShopifyDialog(false)
    proceedWithShopifyOAuth(cleanShop)
  }

  const proceedWithShopifyOAuth = (cleanShop: string) => {

    // 1. Configuration (From your Env Variables)
    const clientId = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SHOPIFY_REDIRECT_URI || "http://localhost:3002/callback";
    
    if (!clientId) {
      toast.error(t('toast.error.shopifyClientIdNotConfigured'), {
        description: t('toast.error.shopifyClientIdNotConfiguredDesc'),
      });
      return;
    }

    if (!user?.id) {
      toast.error(t('toast.error.userNotAuthenticated'), {
        description: t('toast.error.userNotAuthenticatedDesc'),
      });
      return;
    }

    // 2. Define Permissions (Scopes) for Shopify
    // Shopify uses comma-separated scopes
    // Only request scopes that are needed for Haady Business functionality
    const scopes = [
      'read_products',      // Sync products from Shopify
      'write_products',     // Update products in Shopify
      'read_orders',        // View orders
      'write_orders',       // Update order status
      'read_inventory',     // Sync inventory levels
      'write_inventory',    // Update stock quantities
      'read_customers',     // View customer info for orders
      'read_fulfillments',  // View fulfillment status
      'write_fulfillments', // Update fulfillment status
      'read_shipping',      // View shipping settings
    ].join(',');

    // 3. Security State (include platform and shop for callback routing)
    // Format: userId:shopify:shopDomain
    const state = `${user.id}:shopify:${cleanShop}`; 

    // 4. Construct the URL
    // Shopify OAuth URL format: https://{shop}.myshopify.com/admin/oauth/authorize
    const shopUrl = `https://${cleanShop}.myshopify.com`;
    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state,
    });

    const authUrl = `${shopUrl}/admin/oauth/authorize?${params.toString()}`;

    // Debug: Log the URL to console
    console.log('🛍️ Shopify OAuth Configuration:');
    console.log('  Cleaned Shop:', cleanShop);
    console.log('  Full Shop URL:', shopUrl);
    console.log('  Client ID:', clientId);
    console.log('  Redirect URI:', redirectUri);
    console.log('  Scopes:', scopes);
    console.log('  State:', state);
    console.log('  Full OAuth URL:', authUrl);
    console.log('');
    console.log('✅ Generated URL format: https://' + cleanShop + '.myshopify.com/admin/oauth/authorize');
    console.log('ℹ️  Note: Shopify may redirect to admin.shopify.com/store/... format (this is normal)');
    console.log('⚠️  Make sure the Redirect URI matches EXACTLY in Shopify Partner Dashboard!');
    console.log('⚠️  If OAuth fails, check that redirect_uri and state parameters are preserved after redirect');

    // Validate the URL format before redirecting
    // We generate the standard format, but Shopify may redirect to admin.shopify.com format
    if (!authUrl.includes(`${cleanShop}.myshopify.com/admin/oauth/authorize`)) {
      console.error('❌ Invalid OAuth URL format!', authUrl);
      toast.error(t('toast.error.invalidOAuthUrl'), {
        description: t('toast.error.invalidOAuthUrlDesc'),
      });
      return;
    }

    // 5. Redirect to Shopify
    window.location.href = authUrl;
  }

  const handlePlatformSelect = (platformId: string) => {
    if (platformId === 'salla') {
      handleSallaClick()
    } else if (platformId === 'zid') {
      handleZidClick()
    } else if (platformId === 'shopify') {
      handleShopifyClick()
    } else {
      console.log('Selected platform:', platformId)
      closeModal()
    }
  }

  const handleModalClose = (open: boolean) => {
    if (!open) {
      closeModal()
      // Reset to first step when modal closes and remove step from URL
      updateStep('choose')
      // Reset manual open flag when modal closes
      setHasManuallyOpened(false)
    }
  }

  // Get modal title and subtitle based on step
  const getModalContent = () => {
    if (modalStep === 'connect-platform') {
      return {
        title: t('onboarding.modal.title.choosePlatform'),
        subtitle: t('onboarding.modal.subtitle.choosePlatform'),
      }
    }
    return {
      title: t('onboarding.modal.title.welcome'),
      subtitle: t('onboarding.modal.subtitle.welcome'),
    }
  }

  const { title, subtitle } = getModalContent()

  return (
    <>
      <AppSidebar side={isRTL ? "right" : "left"} />
      <SidebarInset className="shadow-none md:shadow-none [&]:!shadow-none">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-gray-100 relative overflow-hidden">
          {/* TODO: Wormmy animation - will be reimplemented with new architecture */}
          <div className="flex items-center gap-3 flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className={cn(
                  "-ms-1 absolute z-10 size-9 [&_svg]:!h-6 [&_svg]:!w-6 text-gray-500 hover:text-[#F4610B] hover:bg-orange-100 transition-colors",
                  isRTL ? "right-4" : "left-4"
                )} />
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                sideOffset={16} 
                className="text-xs px-2 py-1.5"
              >
                Toggle Sidebar
              </TooltipContent>
            </Tooltip>
            <div className={cn(
              "absolute z-10 left-1/2 -translate-x-1/2"
            )}>
              <div className="relative">
                <Search className={cn(
                  "absolute h-4 w-4 text-muted-foreground pointer-events-none",
                  isRTL ? "right-3" : "left-3",
                  "top-1/2 -translate-y-1/2"
                )} />
                <Input
                  type="text"
                  placeholder={t('header.search.placeholder')}
                  className={cn(
                    "h-11 pl-9",
                    isRTL ? "pr-9" : "pr-20",
                    "w-[200px] sm:w-[250px] md:w-[300px] lg:w-[350px] xl:w-[400px]",
                    "cursor-pointer"
                  )}
                  onClick={() => setIsSearchModalOpen(true)}
                  readOnly
                />
                <div className={cn(
                  "absolute pointer-events-none",
                  isRTL ? "left-3" : "right-3",
                  "top-1/2 -translate-y-1/2"
                )}>
                  <Kbd className="bg-gray-100 text-gray-600 border border-gray-200 text-xs">
                    {isMac ? '⌘' : 'Ctrl'} K
                  </Kbd>
                </div>
              </div>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-3 h-full absolute z-10",
            isRTL ? "left-4" : "right-4"
          )}>
            <div className="flex items-center relative">
              {/* Last sync timestamp */}
              {lastSyncTime && (
                <div
                  className={cn(
                    'flex items-center gap-2 transition-opacity',
                    'duration-500 ease-out opacity-100 me-2'
                  )}
                >
                  <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                    {t('header.sync.updated')} {formatRelativeTime(lastSyncTime)}
                  </span>
                </div>
              )}
              {/* TODO: Sync button - to be reimplemented with new architecture */}
            </div>
            <NotificationDrawer
              updates={dummyUpdates}
              messages={dummyMessages}
              onUpdateRead={handleUpdateRead}
              onMarkAllAsRead={handleMarkAllAsRead}
            />
            <Drawer open={isStoreDropdownOpen} onOpenChange={setIsStoreDropdownOpen} direction={isRTL ? "left" : "right"}>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 ml-2 [&_svg]:!h-6 [&_svg]:!w-6 text-[#F4610B] hover:text-[#F4610B] bg-[#F4610B]/5 hover:bg-[#F4610B]/10 flex items-center justify-center transition-colors relative"
                aria-label={storeName || "Store Settings"}
                onClick={() => setIsStoreDropdownOpen(true)}
              >
                {(() => {
                  const currentStore = storeConnections.find(c => c.id === selectedConnectionId)
                  const platform = currentStore?.platform || selectedConnection?.platform
                  const uploadedLogoUrl = currentStore?.store_logo_url || storeLogoUrl
                  const logoZoomLevel = currentStore?.logo_zoom || logoZoom || 100
                  const platformLogoUrl = platform ? PLATFORM_LOGOS[platform?.toLowerCase()] : null
                  
                  // Show uploaded logo if available
                  if (uploadedLogoUrl) {
                    return (
                      <>
                        <div className="absolute inset-0 overflow-hidden rounded-lg">
                          <Image
                            key={uploadedLogoUrl}
                            src={uploadedLogoUrl}
                            alt="Store logo"
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            style={{
                              transform: `scale(${logoZoomLevel / 100})`,
                              transition: 'transform 0.2s ease-out'
                            }}
                            unoptimized
                          />
                        </div>
                        {/* Platform logo badge overlay */}
                        {platformLogoUrl && (
                          <div className="absolute -bottom-1 -right-3 w-6 h-6 rounded-md bg-white shadow-md overflow-hidden flex items-center justify-center z-50">
                            <Image
                              src={platformLogoUrl || ''}
                              alt={platform || 'Platform'}
                              width={18}
                              height={18}
                              className="object-contain w-full h-full"
                              unoptimized
                            />
                          </div>
                        )}
                      </>
                    )
                  }
                  
                  // Default: Store icon with light orange background and platform logo overlay
                  return (
                    <>
                      <div className="w-full h-full flex items-center justify-center bg-[#F4610B]/10 rounded-lg">
                        <Store size={24} className="text-[#F4610B]" />
                      </div>
                      {/* Platform logo badge overlay */}
                      {platformLogoUrl && (
                        <div className="absolute -bottom-1 -right-3 w-6 h-6 rounded-md bg-white shadow-md overflow-hidden flex items-center justify-center z-50">
                          <Image
                            src={platformLogoUrl || ''}
                            alt={platform || 'Platform'}
                            width={18}
                            height={18}
                            className="object-contain w-full h-full"
                            unoptimized
                          />
                        </div>
                      )}
                    </>
                  )
                })()}
              </Button>
              <DrawerContent 
                className={cn("w-[480px] border-0 p-0 rounded-none h-full flex flex-col", isRTL && "text-right")}
                style={{
                  ...(locale === 'ar' ? { 
                    fontFamily: 'var(--font-ibm-plex-arabic), "IBM Plex Sans Arabic", sans-serif',
                    direction: 'rtl'
                  } : {
                    direction: 'ltr'
                  }),
                  boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)'
                }}
              >
                <DrawerTitle className="sr-only">{storeName || t("sidebar.storeSettings")}</DrawerTitle>
                <div className="px-6 py-6 bg-gray-100/50 rounded-t-2xl">
                  <div className={cn("flex items-start gap-4", isRTL && "flex-row-reverse justify-end")}>
                    <div 
                      className="relative w-14 h-14 bg-[#F4610B]/10 rounded-xl flex-shrink-0 group cursor-pointer overflow-hidden flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsLogoUploadModalOpen(true)
                        setIsStoreDropdownOpen(false)
                      }}
                    >
                      {storeLogoUrl ? (
                        <div className="relative w-full h-full rounded-xl overflow-hidden">
                          <Image
                            key={storeLogoUrl}
                            src={storeLogoUrl}
                            alt="Store logo"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <Store className="h-7 w-7 text-[#F4610B] transition-colors" />
                      )}
                      {/* Hover overlay with edit icon */}
                      <div className="absolute inset-0 bg-[#F4610B]/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <Pencil className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                      <div className={cn("flex items-center gap-2 mb-0.5", isRTL && "flex-row-reverse justify-end")}>
                        <span className="text-sm font-semibold text-gray-900">{storeName || 'N/A'}</span>
                        {storeNameAr && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>{storeNameAr}</span>
                          </>
                        )}
                      </div>
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse justify-end")}>
                        <div className={cn("text-xs text-gray-500 font-mono", isRTL && "text-right")}>
                          {storeId ? storeId.slice(0, 8) : 'N/A'}
                        </div>
                        {storeId && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                await navigator.clipboard.writeText(storeId)
                                toast.success('Store ID copied to clipboard')
                              } catch (error) {
                                if (process.env.NODE_ENV === 'development') {
                                  console.error('Failed to copy:', error)
                                }
                              }
                            }}
                            className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                            aria-label="Copy Store ID"
                          >
                            <Copy className="h-3.5 w-3.5 text-gray-900" />
                          </button>
                        )}
                      </div>
                      <div className={cn("text-xs text-gray-500 font-mono mt-0.5", isRTL && "text-right")}>{user?.email || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-6">
                  <button
                    onClick={() => {
                      router.push('/dashboard/settings/store')
                      setIsStoreDropdownOpen(false)
                    }} 
                    onMouseEnter={() => setIsSettingsHover(true)}
                    onMouseLeave={() => setIsSettingsHover(false)}
                    className={cn("w-full group px-3 py-3.5 rounded-xl hover:bg-orange-50 focus:bg-orange-50 hover:text-[#F4610B] focus:text-[#F4610B] flex items-center transition-none", isRTL && "flex-row-reverse")}
                  >
                    <AnimateIcon animate={isSettingsHover}>
                      <Settings size={16} className={cn("text-gray-400 group-hover:text-[#F4610B] transition-none", isRTL ? "ml-2" : "mr-2")} />
                    </AnimateIcon>
                    <span className={cn("text-sm", isRTL ? "text-right" : "text-left")}>{t("sidebar.storeSettings")}</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push('/dashboard/support')
                      setIsStoreDropdownOpen(false)
                    }} 
                    onMouseEnter={() => setIsSupportHover(true)}
                    onMouseLeave={() => setIsSupportHover(false)}
                    className={cn("w-full group px-3 py-3.5 rounded-xl hover:bg-orange-50 focus:bg-orange-50 hover:text-[#F4610B] focus:text-[#F4610B] flex items-center transition-none", isRTL && "flex-row-reverse")}
                  >
                    <AnimateIcon animate={isSupportHover}>
                      <MessageCircleQuestion size={16} className={cn("text-gray-400 group-hover:text-[#F4610B] transition-none", isRTL ? "ml-2" : "mr-2")} />
                    </AnimateIcon>
                    <span className={cn("text-sm", isRTL ? "text-right" : "text-left")}>{t("sidebar.user.support")}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      const otherLang = locale === 'en' ? 'ar' : 'en'
                      // Set cookie
                      document.cookie = `locale=${otherLang};path=/;max-age=31536000;sameSite=Lax`
                      // Reload with new locale
                      const url = new URL(window.location.href)
                      url.searchParams.set('_locale', otherLang)
                      url.searchParams.set('_t', Date.now().toString())
                      window.location.replace(url.toString())
                    }}
                    onMouseEnter={() => setIsLanguageHover(true)}
                    onMouseLeave={() => setIsLanguageHover(false)}
                    className={cn("w-full group px-3 py-3.5 rounded-xl hover:bg-orange-50 focus:bg-orange-50 hover:text-[#F4610B] focus:text-[#F4610B] flex items-center transition-none", isRTL && "flex-row-reverse")}
                  >
                    <AnimateIcon animate={isLanguageHover}>
                      <Languages size={16} className={cn("text-gray-400 group-hover:text-[#F4610B] transition-none", isRTL ? "ml-2" : "mr-2")} />
                    </AnimateIcon>
                    <span className={cn("text-sm", isRTL ? "text-right" : "text-left")}>{locale === 'en' ? t("sidebar.user.switchToArabic") : t("sidebar.user.switchToEnglish")}</span>
                  </button>
                </div>
                <DrawerFooter className="px-6 py-2 border-t border-gray-100 mt-auto">
                  <button
                    onClick={async () => {
                      await signOut()
                      router.push('/auth/login')
                      router.refresh()
                    }}
                    onMouseEnter={() => setIsLogoutHover(true)}
                    onMouseLeave={() => setIsLogoutHover(false)}
                    className={cn("w-full group text-red-600 focus:text-red-600 focus:bg-red-50 hover:text-red-600 hover:bg-red-50 px-3 py-3.5 rounded-xl [&_svg]:text-red-600 [&_svg]:group-hover:text-red-600 flex items-center", isRTL && "flex-row-reverse")}
                  >
                    <AnimateIcon animate={isLogoutHover}>
                      <LogOut size={16} className={cn("text-red-600", isRTL ? "ml-2" : "mr-2")} />
                    </AnimateIcon>
                    <span className={cn("text-sm", isRTL ? "text-right" : "text-left")}>{t("sidebar.user.logout")}</span>
                  </button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </header>
        <SearchModal 
          open={isSearchModalOpen} 
          onOpenChange={setIsSearchModalOpen} 
        />
        {/* Create Store Modal */}
        <CreateStoreModal
          open={isCreateStoreModalOpen}
          onOpenChange={setIsCreateStoreModalOpen}
        />
        {/* Store Logo Upload Modal */}
        <Dialog open={isLogoUploadModalOpen} onOpenChange={setIsLogoUploadModalOpen}>
          <DialogContent className="max-w-md rounded-3xl shadow-2xl bg-white p-6 sm:p-8">
            <DialogHeader className="text-left space-y-1.5">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {t('header.storeLogo.uploadTitle')}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base text-gray-500">
                {t('header.storeLogo.uploadDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Logo Preview Section */}
              {(logoPreview || storeLogoUrl) && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-500 text-center">Preview</p>
                  <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center border-2 border-dashed border-gray-700">
                    {logoPreview ? (
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        fill
                        className="object-contain"
                        style={{
                          transform: `scale(${logoZoom / 100})`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        unoptimized
                      />
                    ) : storeLogoUrl ? (
                      <Image
                        key={storeLogoUrl}
                        src={storeLogoUrl}
                        alt="Current store logo"
                        fill
                        className="object-contain"
                        style={{
                          transform: `scale(${logoZoom / 100})`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        unoptimized
                      />
                    ) : null}
                  </div>
                  
                  {/* Zoom Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-2">
                      <button
                        type="button"
                        onClick={() => setLogoZoom(Math.max(50, logoZoom - 10))}
                        className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
                        aria-label="Zoom out"
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      <Slider
                        value={[logoZoom]}
                        onValueChange={(value) => setLogoZoom(value[0])}
                        min={50}
                        max={200}
                        step={5}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoZoom(Math.min(200, logoZoom + 10))}
                        className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
                        aria-label="Zoom in"
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      {t('header.storeLogo.adjustImage') || 'Adjust the image until it fits inside the rounded box'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null)
                        setLogoPreview(null)
                        setLogoZoom(100)
                        document.getElementById('logo-upload')?.click()
                      }}
                      className="text-sm font-medium text-[#F4610B] hover:text-[#F4610B]/80 transition-colors mx-auto block"
                    >
                      {t('header.storeLogo.selectDifferentImage') || 'Select a different image'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Upload Area */}
              <div className="space-y-2">
                <label
                  htmlFor="logo-upload"
                  className="relative flex flex-col items-center justify-center w-full h-32 border border-dashed border-gray-300 rounded-xl bg-white hover:bg-[#F4610B]/10 hover:border-[#F4610B] transition-colors cursor-pointer group"
                >
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setLogoFile(file)
                        setLogoZoom(100) // Reset zoom when new file is selected
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setLogoPreview(reader.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center justify-center gap-3">
                    <p className="text-sm text-gray-600">
                      {t('header.storeLogo.dragAndDrop')}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-[#F4610B] text-white border-[#F4610B] hover:bg-[#F4610B]/90 hover:text-white"
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById('logo-upload')?.click()
                      }}
                    >
                      {t('header.storeLogo.chooseLogo')}
                    </Button>
                    <p className="text-xs text-gray-500">
                      {t('header.storeLogo.fileRequirements')}
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Remove Logo Button (only show if logo exists) */}
              {storeLogoUrl && !logoPreview && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedConnectionId) return
                      
                      setIsUploadingLogo(true)
                      try {
                        const response = await fetch(`/api/store-connections/${selectedConnectionId}/upload-logo`, {
                          method: 'DELETE',
                        })

                        const data = await response.json()

                        if (!response.ok) {
                          throw new Error(data.error || 'Remove failed')
                        }

                        toast.success(t('header.storeLogo.removeSuccess'))
                        setIsLogoUploadModalOpen(false)
                        setLogoZoom(100) // Reset zoom after removal
                        
                        // Refresh store data from context
                        await refreshStore()
                        
                        // Dispatch event to notify sidebar to refresh
                        window.dispatchEvent(new CustomEvent('storeLogoUpdated', { 
                          detail: { connectionId: selectedConnectionId, logoUrl: null, logoZoom: 100 }
                        }))
                      } catch (error) {
                        console.error('Error removing logo:', error)
                        toast.error(t('header.storeLogo.removeError'))
                      } finally {
                        setIsUploadingLogo(false)
                      }
                    }}
                    disabled={isUploadingLogo}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('header.storeLogo.removeLogo')}
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter className="flex-row-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
              <Button
                onClick={async () => {
                  if (!logoFile || !selectedConnectionId) return
                  
                  setIsUploadingLogo(true)
                  try {
                    const formData = new FormData()
                    formData.append('file', logoFile)
                    formData.append('zoom', logoZoom.toString())

                    const response = await fetch(`/api/store-connections/${selectedConnectionId}/upload-logo`, {
                      method: 'POST',
                      body: formData,
                    })

                    const data = await response.json()

                    if (!response.ok) {
                      throw new Error(data.error || 'Upload failed')
                    }

                    toast.success(t('header.storeLogo.uploadSuccess'))
                    setIsLogoUploadModalOpen(false)
                    setLogoFile(null)
                    setLogoPreview(null)
                    setLogoZoom(100) // Reset zoom after upload
                    
                    // Refresh store data from context
                    await refreshStore()
                    
                    // Dispatch event to notify sidebar to refresh
                    if (data.logoUrl) {
                      const logoUrlWithTimestamp = `${data.logoUrl}?t=${Date.now()}`
                      window.dispatchEvent(new CustomEvent('storeLogoUpdated', { 
                        detail: { connectionId: selectedConnectionId, logoUrl: logoUrlWithTimestamp, logoZoom: logoZoom }
                      }))
                    }
                  } catch (error) {
                    console.error('Error uploading logo:', error)
                    toast.error(t('header.storeLogo.uploadError'))
                  } finally {
                    setIsUploadingLogo(false)
                  }
                }}
                disabled={!logoFile || isUploadingLogo}
                className="bg-[#F4610B] hover:bg-[#F4610B]/90 text-white"
              >
                {isUploadingLogo ? t('common.uploading') : t('common.upload')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsLogoUploadModalOpen(false)
                  setLogoFile(null)
                  setLogoPreview(null)
                  setLogoZoom(100) // Reset zoom when closing
                }}
                className="border-gray-200 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:px-0 sm:py-4 md:px-4 lg:px-8 pb-8 relative h-full overflow-y-auto">
          {children}
          {/* Loading overlay when changing stores - DISABLED */}
          {/* {isChangingStore && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Store className="h-10 w-10 text-[#F4610B] animate-bounce" />
                  <div className="absolute inset-0 h-10 w-10 text-[#F4610B]/20 animate-ping">
                    <Store className="h-full w-full" />
                  </div>
                </div>
                <p 
                  className="text-sm font-medium text-gray-600 shimmer-text"
                  style={{
                    animation: 'shimmer 8s linear infinite',
                  }}
                >
                  {t('header.loading.switchingStore')}
                </p>
              </div>
            </div>
          )} */}
        </div>
      </SidebarInset>

      <WideCardModal
        open={isWelcomeModalOpen}
        onOpenChange={handleModalClose}
        title={title}
        subtitle={subtitle}
        showSkip={false}
        dismissable={true}
      >
        {modalStep === 'choose' ? (
          /* Step 1: Choose between Connect or Create */
          <div className="flex gap-4">
            <div 
              className="group flex-1 rounded-4xl p-6 border-[2px] border-gray-100 hover:border-[#F4610B] transition-all cursor-pointer relative flex flex-col"
              onMouseEnter={() => setIsCardHovered(true)}
              onMouseLeave={() => setIsCardHovered(false)}
              onClick={handleConnectStoreClick}
            >
              {/* Unplug Icon */}
              <div className="mb-4">
                <AnimateIcon animate={isCardHovered}>
                  <Unplug size={48} className="text-gray-400 group-hover:text-[#F4610B] transition-colors" />
                </AnimateIcon>
              </div>
              
              {/* Headline */}
              <h3 className="font-semibold text-gray-900 group-hover:text-[#F4610B] transition-colors mb-3">{t('onboarding.modal.connectStore.title')}</h3>
              
              {/* Subtext */}
              <p className="text-xs text-gray-500 transition-colors mb-4">
                {t('onboarding.modal.connectStore.description')}
              </p>
              
              {/* Why List */}
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">{t('onboarding.modal.connectStore.features.noManualEntry')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">{t('onboarding.modal.connectStore.features.autoSync')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">{t('onboarding.modal.connectStore.features.unifiedOrders')}</span>
                </div>
              </div>
              
              {/* Logos that become colorful on hover */}
              <div className="flex items-center gap-4 mb-4">
                <Image
                  src={`${ECOMMERCE_STORAGE_URL}/salla-logo.png`}
                  alt="Salla"
                  width={80}
                  height={30}
                  className="h-8 w-auto object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  unoptimized
                />
                <Image
                  src={`${ECOMMERCE_STORAGE_URL}/zid-logo.png`}
                  alt="Zid"
                  width={80}
                  height={30}
                  className="h-8 w-auto object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  unoptimized
                />
                <Image
                  src={`${ECOMMERCE_STORAGE_URL}/shopify-logo.png`}
                  alt="Shopify"
                  width={80}
                  height={30}
                  className="h-8 w-auto object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  unoptimized
                />
              </div>
              
              {/* Button */}
              <Button
                variant="outline"
                className="w-full justify-between mt-auto bg-[#F4610B] text-white border-[#F4610B] opacity-0 group-hover:opacity-100 transition-all h-12 rounded-xl shadow-none hover:bg-[#F4610B] hover:text-white"
              >
                <span>{t('onboarding.modal.connectStore.button')}</span>
                <ArrowRight className={cn("h-4 w-4 group-hover:translate-x-1 transition-transform", isRTL && "group-hover:-translate-x-1")} />
              </Button>
            </div>
            <div 
              className="group flex-1 rounded-4xl p-6 border-[2px] border-gray-100 hover:border-[#F4610B] transition-all cursor-pointer relative flex flex-col"
              onMouseEnter={() => setIsCard2Hovered(true)}
              onMouseLeave={() => setIsCard2Hovered(false)}
            >
              {/* Sparkles Icon */}
              <div className="mb-4">
                <AnimateIcon animate={isCard2Hovered}>
                  <Sparkles size={48} className="text-gray-400 group-hover:text-[#F4610B] transition-colors" />
                </AnimateIcon>
              </div>
              
              {/* Headline */}
              <h3 className="font-semibold text-gray-900 group-hover:text-[#F4610B] transition-colors mb-3">{t('onboarding.modal.createStore.title')}</h3>
              
              {/* Subtext */}
              <p className="text-xs text-gray-500 transition-colors mb-4">
                {t('onboarding.modal.createStore.description')}
              </p>
              
              {/* Why List */}
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">{t('onboarding.modal.createStore.features.giftFirst')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">{t('onboarding.modal.createStore.features.integratedDelivery')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">{t('onboarding.modal.createStore.features.aiMarketing')}</span>
                </div>
              </div>
              
              {/* Placeholder to match logos section spacing in card 1 */}
              <div className="h-8 mb-4" />
              
              {/* Button */}
              <Button
                variant="outline"
                className="w-full justify-between mt-auto bg-[#F4610B] text-white border-[#F4610B] opacity-0 group-hover:opacity-100 transition-all h-12 rounded-xl shadow-none hover:bg-[#F4610B] hover:text-white"
                onClick={() => {
                  closeModal()
                  setIsCreateStoreModalOpen(true)
                }}
              >
                <span>{t('onboarding.modal.createStore.button')}</span>
                <ArrowRight className={cn("h-4 w-4 group-hover:translate-x-1 transition-transform", isRTL && "group-hover:-translate-x-1")} />
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Select E-commerce Platform */
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={handleBackToChoose}
              className={cn(
                "flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2",
                isRTL && "flex-row-reverse"
              )}
            >
              <ArrowLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
              {t('onboarding.modal.back')}
            </button>
            
            {/* Platform Cards */}
            <div className="grid grid-cols-3 gap-4">
              {ECOMMERCE_PLATFORMS.map((platform) => (
                <div
                  key={platform.id}
                  className={`group rounded-3xl p-5 border-[2px] transition-all cursor-pointer flex flex-col items-center text-center ${
                    hoveredPlatform === platform.id 
                      ? 'border-[#F4610B]' 
                      : 'border-gray-100 hover:border-[#F4610B]'
                  }`}
                  onMouseEnter={() => setHoveredPlatform(platform.id)}
                  onMouseLeave={() => setHoveredPlatform(null)}
                  onClick={() => handlePlatformSelect(platform.id)}
                >
                  {/* Platform Logo */}
                  <div className="h-16 flex items-center justify-center mb-4">
                    <Image
                      src={platform.logo}
                      alt={platform.name}
                      width={120}
                      height={48}
                      className={`h-12 w-auto object-contain transition-all duration-300 ${
                        hoveredPlatform === platform.id 
                          ? 'grayscale-0 opacity-100' 
                          : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'
                      }`}
                      unoptimized
                    />
                  </div>
                  
                  {/* Platform Name */}
                  <h3 className={`font-semibold mb-2 transition-colors ${
                    hoveredPlatform === platform.id 
                      ? 'text-[#F4610B]' 
                      : 'text-gray-900 group-hover:text-[#F4610B]'
                  }`}>
                    {platform.name}
                  </h3>
                  
                  {/* Description */}
                  <p className={`text-xs mb-4 transition-colors ${
                    hoveredPlatform === platform.id 
                      ? 'text-[#F4610B]' 
                      : 'text-gray-500 group-hover:text-[#F4610B]'
                  }`}>
                    {platform.description}
                  </p>
                  
                  {/* Features */}
                  <div className="space-y-1.5 flex-1 w-full">
                    {platform.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 justify-center">
                        <Check className={`h-3 w-3 flex-shrink-0 transition-colors ${
                          hoveredPlatform === platform.id 
                            ? 'text-[#F4610B]' 
                            : 'text-gray-400 group-hover:text-[#F4610B]'
                        }`} />
                        <span className={`text-xs transition-colors ${
                          hoveredPlatform === platform.id 
                            ? 'text-[#F4610B]' 
                            : 'text-gray-500 group-hover:text-[#F4610B]'
                        }`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Connect Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full mt-4 transition-all h-10 rounded-lg shadow-none ${
                      hoveredPlatform === platform.id 
                        ? 'bg-[#F4610B] text-white border-[#F4610B] opacity-100' 
                        : 'bg-transparent text-gray-600 border-gray-200 opacity-0 group-hover:opacity-100 group-hover:bg-[#F4610B] group-hover:text-white group-hover:border-[#F4610B]'
                    }`}
                  >
                    {t('onboarding.modal.connect')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </WideCardModal>

      {/* TODO: Product Approval Modal - to be reimplemented with new architecture */}

      {/* Celebration Modal */}
      <CelebrationModal
        open={showCelebration}
        onOpenChange={(open) => {
          if (open) {
            // Modal is opening - mark it as shown
            celebrationWasShownRef.current = true
            setShowCelebration(true)
          } else if (celebrationWasShownRef.current) {
            // Modal is closing AND it was actually shown - reload
            setShowCelebration(false)
            celebrationWasShownRef.current = false
            setTimeout(() => {
              window.location.reload()
            }, 300)
          }
          // If celebrationWasShownRef.current is false, this is a spurious close event - ignore
        }}
        platform={celebrationPlatform}
        storeName={celebrationStoreName}
        onDismiss={() => {
          // Reload handled by onOpenChange
        }}
      />

      {/* Shopify Shop Domain Dialog */}
      <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <div className="flex justify-start mb-4">
              <Image
                src={`${ECOMMERCE_STORAGE_URL}/shopify-logo.png`}
                alt="Shopify"
                width={120}
                height={48}
                className="h-12 w-auto object-contain"
                unoptimized
              />
            </div>
            <DialogTitle>{t('onboarding.modal.shopifyDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('onboarding.modal.shopifyDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop-domain">{t('onboarding.modal.shopifyDialog.label')}</Label>
              <Input
                id="shop-domain"
                type="text"
                placeholder={t('onboarding.modal.shopifyDialog.placeholder')}
                value={shopDomainInput}
                onChange={(e) => setShopDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleShopifyDialogSubmit()
                  }
                }}
                autoFocus
              />
              <p className="text-xs font-medium text-muted-foreground">
                {t('onboarding.modal.shopifyDialog.examples')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowShopifyDialog(false)}
            >
              {t('onboarding.modal.shopifyDialog.cancel')}
            </Button>
            <Button
              onClick={handleShopifyDialogSubmit}
              className="bg-[#F4610B] hover:bg-[#E55A0A] text-white"
            >
              {t('onboarding.modal.shopifyDialog.continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutContentInner>
        {children}
      </DashboardLayoutContentInner>
    </Suspense>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OnboardingModalProvider>
      <StoreConnectionProvider>
        <SidebarProvider>
          <DashboardLayoutContent>
            {children}
          </DashboardLayoutContent>
        </SidebarProvider>
      </StoreConnectionProvider>
    </OnboardingModalProvider>
  )
}
