'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
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
import { Button } from '@/components/ui/button'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { RefreshCcw } from '@/components/animate-ui/icons/refresh-ccw'
import { ICON_BUTTON_CLASSES, DEFAULT_ICON_SIZE } from '@/lib/ui-constants'
import { WideCardModal } from '@/components/ui/wide-card-modal'
import { useAuth } from '@/lib/auth/auth-context'
import { useStoreConnection } from '@/lib/store-connection-context'
import { toast } from '@/lib/toast'
import { safeFetch, handleError } from '@/lib/error-handler'
import Image from 'next/image'
import { Check, ArrowRight, ArrowLeft, Zap, CheckCircle2, Gift, MessageSquare, Mail, Bell, AlertCircle, Info, HelpCircle, User, ShoppingCart, Package, CreditCard, Settings, Shield, TrendingUp, Star, Loader2, Store } from 'lucide-react'
import { Unplug } from '@/components/animate-ui/icons/unplug'
import { Sparkles } from '@/components/animate-ui/icons/sparkles'
import { supabase } from '@/lib/supabase/client'
import { CelebrationModal } from '@/components/celebration-modal'
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
import { cn } from '@/lib/utils'
import { NotificationDrawer } from '@/components/notification-drawer'

const ECOMMERCE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce';

// E-commerce platforms data
const ECOMMERCE_PLATFORMS = [
  {
    id: 'salla',
    name: 'Salla',
    logo: `${ECOMMERCE_STORAGE_URL}/salla-logo.png`,
    description: 'Connect your Salla store to sync products, inventory, and orders automatically.',
    features: ['Auto-sync products', 'Real-time inventory', 'Order management'],
  },
  {
    id: 'zid',
    name: 'Zid',
    logo: `${ECOMMERCE_STORAGE_URL}/zid-logo.png`,
    description: 'Link your Zid store to import your catalog and manage everything from Haady.',
    features: ['Product import', 'Inventory sync', 'Unified dashboard'],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    logo: `${ECOMMERCE_STORAGE_URL}/shopify-logo.png`,
    description: 'Integrate your Shopify store for seamless product and order synchronization.',
    features: ['Full catalog sync', 'Multi-currency', 'Order tracking'],
  },
];

function DashboardLayoutContentInner({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { selectedConnectionId, isChangingStore } = useStoreConnection()
  const { isOpen: isWelcomeModalOpen, open: openModal, close: closeModal, step: modalStep, setStep: setModalStep } = useOnboardingModal()
  const pageName = pathname.split('/').filter(Boolean).pop() || 'Dashboard'
  const capitalizedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1)
  
  // Get step from URL or default to 'choose'
  const urlStep = searchParams.get('step') as 'choose' | 'connect-platform' | null
  const [isCardHovered, setIsCardHovered] = useState(false)
  const [isCard2Hovered, setIsCard2Hovered] = useState(false)
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isHoveringSync, setIsHoveringSync] = useState(false)
  const [currentSyncPhrase, setCurrentSyncPhrase] = useState(0)
  const [messagesCount, setMessagesCount] = useState(0)
  
  // Dummy updates data for testing with read/unread state
  const [dummyUpdates, setDummyUpdates] = useState([
    {
      id: '1',
      title: 'New Feature: Product Sync',
      description: 'We\'ve added automatic product synchronization with your store. Your products will now stay in sync automatically.',
      time: '2 hours ago',
      icon: Zap,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      isRead: false,
    },
    {
      id: '2',
      title: 'System Maintenance Complete',
      description: 'Scheduled maintenance has been completed successfully. All systems are now running smoothly.',
      time: '1 day ago',
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      isRead: false,
    },
    {
      id: '3',
      title: 'Welcome to Haady Business',
      description: 'Thank you for joining Haady Business! Get started by connecting your first store.',
      time: '3 days ago',
      icon: Gift,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      isRead: false,
    },
    {
      id: '4',
      title: 'Inventory Update Available',
      description: 'Your inventory levels have been updated. Check your dashboard to see the latest stock information.',
      time: '5 hours ago',
      icon: Zap,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-50',
      isRead: false,
    },
    {
      id: '5',
      title: 'New Order Received',
      description: 'You have received a new order. Review and process it from your orders dashboard.',
      time: '8 hours ago',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      isRead: true,
    },
    {
      id: '6',
      title: 'Payment Processed',
      description: 'Your payment has been successfully processed. Your subscription is now active.',
      time: '12 hours ago',
      icon: CheckCircle2,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      isRead: true,
    },
    {
      id: '7',
      title: 'Store Connection Established',
      description: 'Your store connection has been successfully established. You can now sync your products.',
      time: '1 day ago',
      icon: Zap,
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-50',
      isRead: false,
    },
    {
      id: '8',
      title: 'Weekly Report Ready',
      description: 'Your weekly sales report is now available. View it in the reports section.',
      time: '2 days ago',
      icon: Gift,
      iconColor: 'text-pink-600',
      iconBg: 'bg-pink-50',
      isRead: true,
    },
    {
      id: '9',
      title: 'Product Sync Completed',
      description: 'Your product synchronization has been completed. 45 products have been synced successfully.',
      time: '2 days ago',
      icon: CheckCircle2,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      isRead: true,
    },
    {
      id: '10',
      title: 'New Integration Available',
      description: 'We\'ve added support for a new e-commerce platform. Connect your store now to get started.',
      time: '3 days ago',
      icon: Zap,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      isRead: false,
    },
    {
      id: '11',
      title: 'Account Settings Updated',
      description: 'Your account settings have been successfully updated. Changes will take effect immediately.',
      time: '4 days ago',
      icon: CheckCircle2,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      isRead: true,
    },
    {
      id: '12',
      title: 'Backup Completed',
      description: 'Your data backup has been completed successfully. Your information is safe and secure.',
      time: '5 days ago',
      icon: Gift,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      isRead: true,
    },
    {
      id: '13',
      title: 'Performance Optimization',
      description: 'We\'ve optimized your dashboard performance. You should notice faster loading times.',
      time: '1 week ago',
      icon: Zap,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      isRead: true,
    },
    {
      id: '14',
      title: 'Security Alert',
      description: 'A new device has logged into your account. If this wasn\'t you, please change your password.',
      time: '1 week ago',
      icon: CheckCircle2,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      isRead: false,
    },
    {
      id: '15',
      title: 'Feature Update',
      description: 'New features have been added to your dashboard. Explore them to enhance your workflow.',
      time: '1 week ago',
      icon: Gift,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      isRead: true,
    },
  ])
  
  // Dummy messages data for testing
  const [dummyMessages, setDummyMessages] = useState([
    {
      id: 'm1',
      title: 'New Customer Inquiry',
      description: 'You have received a new customer inquiry about your products. Please respond within 24 hours.',
      time: '30 min ago',
      icon: MessageSquare,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      isRead: false,
    },
    {
      id: 'm2',
      title: 'Order Question',
      description: 'A customer has a question about their recent order. Check the order details and respond.',
      time: '1 hour ago',
      icon: Mail,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      isRead: false,
    },
    {
      id: 'm3',
      title: 'Support Ticket Created',
      description: 'A new support ticket has been created. Review and assign it to the appropriate team member.',
      time: '2 hours ago',
      icon: Bell,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      isRead: false,
    },
    {
      id: 'm4',
      title: 'Product Review Received',
      description: 'You have received a new product review. Check it out and respond if needed.',
      time: '3 hours ago',
      icon: Star,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-50',
      isRead: false,
    },
    {
      id: 'm5',
      title: 'Refund Request',
      description: 'A customer has requested a refund for their order. Review the request and process accordingly.',
      time: '5 hours ago',
      icon: AlertCircle,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      isRead: true,
    },
    {
      id: 'm6',
      title: 'Shipping Update',
      description: 'Your shipping provider has sent an update about a package delivery. Check the tracking information.',
      time: '6 hours ago',
      icon: Package,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      isRead: false,
    },
    {
      id: 'm7',
      title: 'Customer Feedback',
      description: 'A customer has left feedback about their shopping experience. Read their comments.',
      time: '8 hours ago',
      icon: Info,
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-50',
      isRead: true,
    },
    {
      id: 'm8',
      title: 'Account Verification',
      description: 'A new customer account needs verification. Review and approve the account.',
      time: '10 hours ago',
      icon: User,
      iconColor: 'text-pink-600',
      iconBg: 'bg-pink-50',
      isRead: false,
    },
    {
      id: 'm9',
      title: 'Payment Issue',
      description: 'There is a payment issue with one of your orders. Review and resolve the payment problem.',
      time: '12 hours ago',
      icon: CreditCard,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      isRead: true,
    },
    {
      id: 'm10',
      title: 'Inventory Alert',
      description: 'One of your products is running low on stock. Consider restocking soon to avoid out-of-stock situations.',
      time: '1 day ago',
      icon: ShoppingCart,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      isRead: false,
    },
    {
      id: 'm11',
      title: 'Help Request',
      description: 'A customer needs help with using your platform. Provide assistance through the support channel.',
      time: '1 day ago',
      icon: HelpCircle,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      isRead: true,
    },
    {
      id: 'm12',
      title: 'Security Notification',
      description: 'Your account security settings have been updated. If this wasn\'t you, please review your account.',
      time: '2 days ago',
      icon: Shield,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      isRead: true,
    },
    {
      id: 'm13',
      title: 'Sales Report',
      description: 'Your monthly sales report is ready. Review your performance metrics and insights.',
      time: '2 days ago',
      icon: TrendingUp,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      isRead: false,
    },
    {
      id: 'm14',
      title: 'Settings Changed',
      description: 'Your account settings have been modified. Review the changes to ensure everything is correct.',
      time: '3 days ago',
      icon: Settings,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      isRead: true,
    },
    {
      id: 'm15',
      title: 'Welcome Message',
      description: 'Welcome to Haady Business! We\'re here to help you succeed. Feel free to reach out if you have any questions.',
      time: '1 week ago',
      icon: MessageSquare,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      isRead: true,
    },
  ])
  
  // Handle update read status (optional callback)
  const handleUpdateRead = (id: string) => {
    setDummyUpdates(prev => prev.map(update => 
      update.id === id ? { ...update, isRead: true } : update
    ))
    setDummyMessages(prev => prev.map(message => 
      message.id === id ? { ...message, isRead: true } : message
    ))
  }
  
  // Handle mark all as read (optional callback)
  const handleMarkAllAsRead = () => {
    setDummyUpdates(prev => prev.map(update => ({ ...update, isRead: true })))
    setDummyMessages(prev => prev.map(message => ({ ...message, isRead: true })))
  }
  
  const syncPhrases = ['Fetching Products', 'Counting Inventory', 'Polishing Things']

  // Format relative time (e.g., "3 min ago", "1 hour ago")
  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'just now'
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) {
      return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`
    }
    
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`
    }
    
    const diffInYears = Math.floor(diffInDays / 365)
    return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`
  }

  // Fetch last sync time from database
  const fetchLastSyncTime = useCallback(async () => {
    if (!selectedConnectionId || !user?.id) {
      setLastSyncTime(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('store_connections')
        .select('last_sync_at')
        .eq('id', selectedConnectionId)
        .eq('user_id', user.id)
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

  // Rotate sync phrases while syncing
  useEffect(() => {
    if (!isSyncing) {
      setCurrentSyncPhrase(0)
      return
    }

    const interval = setInterval(() => {
      setCurrentSyncPhrase((prev) => (prev + 1) % syncPhrases.length)
    }, 2000) // Change phrase every 2 seconds

    return () => clearInterval(interval)
  }, [isSyncing, syncPhrases.length])

  // Handle sync button click
  const handleSync = async () => {
    if (!selectedConnectionId) {
      toast.error('No store selected', {
        description: 'Please select a store connection first.',
      })
      return
    }

    if (isSyncing) {
      return // Prevent multiple simultaneous syncs
    }

    setIsSyncing(true)

    try {
      const response = await safeFetch(
        `/api/store-connections/${selectedConnectionId}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'all' }),
        },
        { context: 'Sync store products', showToast: true }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        // Fetch the updated last_sync_at from database to ensure persistence
        await fetchLastSyncTime()
        
        // Show timestamp immediately by setting syncing to false
        setIsSyncing(false)
        
        if (data.details) {
          const { productsCreated, productsUpdated, productsSynced } = data.details
          let description = 'Your products have been synchronized'
          
          if (productsCreated > 0 && productsUpdated > 0) {
            description = `${productsCreated} new products created, ${productsUpdated} products updated`
          } else if (productsCreated > 0) {
            description = `${productsCreated} new products added to your store`
          } else if (productsUpdated > 0) {
            description = `${productsUpdated} products updated successfully`
          } else if (productsSynced > 0) {
            description = `${productsSynced} products synced successfully`
          }
          
          toast.success('Sync completed successfully!', { description })
        } else {
          toast.success('Sync completed successfully!', { 
            description: 'Your products have been synchronized' 
          })
        }
      } else {
        throw new Error(data.error || data.message || 'Sync failed')
      }
    } catch (error: any) {
      handleError(error, {
        context: 'Sync store products',
        showToast: true,
        fallbackMessage: 'Failed to start sync. Please try again.',
      })
      setIsSyncing(false) // Stop syncing on error too
    }
  }
  const [hasCheckedConnections, setHasCheckedConnections] = useState(false)
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
      setModalStep('choose')
      openModal()
    }
    window.addEventListener('openOnboardingModal', handleOpenModal)
    return () => {
      window.removeEventListener('openOnboardingModal', handleOpenModal)
    }
  }, [openModal, setModalStep])

  // Sync modal step with URL
  useEffect(() => {
    if (urlStep === 'connect-platform') {
      setModalStep('connect-platform')
      openModal()
    } else if (urlStep === 'choose') {
      setModalStep('choose')
      openModal()
    }
  }, [urlStep, setModalStep, openModal])

  // Check if user has any store connections on mount
  useEffect(() => {
    const checkStoreConnections = async () => {
      if (!user?.id || hasCheckedConnections) return

      try {
        const { data: connections, error } = await supabase
          .from('store_connections')
          .select('platform')
          .eq('user_id', user.id)
          .limit(1)

        if (error) {
          console.error('Error checking store connections:', error)
          // If there's an error, don't show the modal
          setHasCheckedConnections(true)
          return
        }

        // Only show modal if no connections exist
        if (!connections || connections.length === 0) {
          openModal()
        }

        setHasCheckedConnections(true)
      } catch (error) {
        console.error('Exception checking store connections:', error)
        setHasCheckedConnections(true)
      }
    }

    checkStoreConnections()
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
      toast.error(`Failed to connect ${platformName} store`, {
        description: message || 'Please try again or contact support',
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
      toast.error('Zid Client ID not configured', {
        description: 'Please set NEXT_PUBLIC_ZID_CLIENT_ID in your environment variables',
      });
      return;
    }

    if (!redirectUri || redirectUri.includes('localhost')) {
      toast.error('Invalid Redirect URI', {
        description: 'Zid requires HTTPS. Please set NEXT_PUBLIC_ZID_REDIRECT_URI with an HTTPS URL (use ngrok for local development)',
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
      toast.error('Shop domain required', {
        description: 'Please enter your Shopify store domain',
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
      toast.error('Invalid shop domain', {
        description: 'Shop domain should only contain letters, numbers, hyphens, and underscores. Example: mystore',
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
      toast.error('Shopify Client ID not configured', {
        description: 'Please set NEXT_PUBLIC_SHOPIFY_CLIENT_ID in your environment variables',
      });
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated', {
        description: 'Please sign in to connect a store',
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
      toast.error('Invalid OAuth URL', {
        description: 'The OAuth URL format is incorrect. Please check the console for details.',
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
    }
  }

  // Get modal title and subtitle based on step
  const getModalContent = () => {
    if (modalStep === 'connect-platform') {
      return {
        title: 'Choose your platform',
        subtitle: 'Select the e-commerce platform you want to connect',
      }
    }
    return {
      title: "Let's get your business ready",
      subtitle: 'Do you already sell online, or are you creating something new with Haady?',
    }
  }

  const { title, subtitle } = getModalContent()

  return (
    <>
      <AppSidebar />
      <SidebarInset className="shadow-none md:shadow-none [&]:!shadow-none">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-gray-100 relative">
          <div className="flex items-center gap-3 flex-1">
            <SidebarTrigger className="-ml-1 absolute left-4 z-10" />
          </div>
          <div className="flex items-center gap-3 h-full absolute right-4 z-10">
            <div className="flex items-center relative">
              {/* Syncing text or timestamp */}
              <div
                className={cn(
                  'flex items-center gap-2 transition-opacity',
                  'duration-500 ease-out',
                  (isSyncing || lastSyncTime)
                    ? 'opacity-100 mr-2'
                    : 'opacity-0 mr-0'
                )}
              >
                {isSyncing ? (
                  <>
                    {/* Sparkles indicator */}
                    <AnimateIcon animate={isSyncing} loop={isSyncing} animation="fill">
                      <Sparkles size={12} className="text-gray-300 flex-shrink-0" />
                    </AnimateIcon>
                    <span
                      className={cn(
                        'text-xs font-medium text-gray-600 whitespace-nowrap shimmer-text'
                      )}
                      style={{
                        animation: 'shimmer 6s linear infinite',
                      }}
                    >
                      {syncPhrases[currentSyncPhrase]}
                    </span>
                  </>
                ) : lastSyncTime ? (
                  <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                    Updated {formatRelativeTime(lastSyncTime)}
                  </span>
                ) : null}
              </div>
              {!isSyncing && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${ICON_BUTTON_CLASSES} flex items-center justify-center`}
                      aria-label="Sync Products"
                      onClick={handleSync}
                      disabled={!selectedConnectionId}
                      onMouseEnter={() => setIsHoveringSync(true)}
                      onMouseLeave={() => setIsHoveringSync(false)}
                    >
                      <AnimateIcon animateOnHover>
                        <RefreshCcw size={DEFAULT_ICON_SIZE} />
                      </AnimateIcon>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={10} className="text-xs px-2 py-1.5">
                    Sync Products
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <NotificationDrawer
              updates={dummyUpdates}
              messages={dummyMessages}
              onUpdateRead={handleUpdateRead}
              onMarkAllAsRead={handleMarkAllAsRead}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pl-[100px] md:pl-4 lg:px-8 xl:px-32 2xl:px-48 relative">
          {children}
          {/* Loading overlay when changing stores */}
          {isChangingStore && (
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
                  Switching store...
                </p>
              </div>
            </div>
          )}
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
              <h3 className="font-semibold text-gray-900 group-hover:text-[#F4610B] transition-colors mb-3">Connect Existing Store</h3>
              
              {/* Subtext */}
              <p className="text-xs text-gray-500 transition-colors mb-4">
                Already selling on Salla, Zid, or Shopify? Link your account to auto-sync your products, inventory, and prices instantly.
              </p>
              
              {/* Why List */}
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">No manual entry required</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">Auto-syncs inventory 24/7</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">Unified order management</span>
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
                <span>Connect Store</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
              <h3 className="font-semibold text-gray-900 group-hover:text-[#F4610B] transition-colors mb-3">Create New Store</h3>
              
              {/* Subtext */}
              <p className="text-xs text-gray-500 transition-colors mb-4">
                Starting from scratch? Use Haady's powerful builder to set up your menu, define your delivery zones, and start selling today.
              </p>
              
              {/* Why List */}
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">Custom "Gift-First" store features</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">Integrated Haady Delivery</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-600 group-hover:text-[#F4610B] transition-colors mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">Built-in AI Marketing tools</span>
                </div>
              </div>
              
              {/* Placeholder to match logos section spacing in card 1 */}
              <div className="h-8 mb-4" />
              
              {/* Button */}
              <Button
                variant="outline"
                className="w-full justify-between mt-auto bg-[#F4610B] text-white border-[#F4610B] opacity-0 group-hover:opacity-100 transition-all h-12 rounded-xl shadow-none hover:bg-[#F4610B] hover:text-white"
              >
                <span>Create new Store</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Select E-commerce Platform */
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={handleBackToChoose}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
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
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </WideCardModal>

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
            <DialogTitle>Enter Your Shopify Store Domain</DialogTitle>
            <DialogDescription>
              You can enter just the shop name (e.g., "mystore") or the full domain.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop-domain">Shop Domain</Label>
              <Input
                id="shop-domain"
                type="text"
                placeholder="mystore or mystore.myshopify.com"
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
                Examples: mystore, mystore.myshopify.com
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowShopifyDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShopifyDialogSubmit}
              className="bg-[#F4610B] hover:bg-[#E55A0A] text-white"
            >
              Continue
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
  const [showLoading, setShowLoading] = useState(true)

  useEffect(() => {
    // Ensure loading screen shows for exactly 800ms from mount
    const timer = setTimeout(() => {
      setShowLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  const loadingFallback = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        {/* Haady Logo with Heartbeat Animation */}
        <div className="animate-heartbeat">
          <Image
            src={HAADY_LOGO_URL}
            alt="Haady"
            width={64}
            height={64}
            className="w-16 h-16"
            priority
          />
        </div>
        
        {/* Loading text */}
        <p className="text-sm font-medium text-gray-500 shimmer-text">
          Preparing your dashboard
        </p>
      </div>
    </div>
  )

  return (
    <>
      {showLoading && loadingFallback}
      <Suspense fallback={loadingFallback}>
        <DashboardLayoutContentInner>
          {children}
        </DashboardLayoutContentInner>
      </Suspense>
    </>
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
