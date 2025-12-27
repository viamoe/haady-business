'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocale } from '@/i18n/context'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import Image from 'next/image'

interface StorySlide {
  image: string
  title: string
  titleAr?: string
  subtitle: string
  subtitleAr?: string
  paragraph: string
  paragraphAr?: string
  titleMaxWidth?: string // Tailwind max-width class (e.g., 'max-w-lg', 'max-w-xl', 'max-w-2xl')
}

const storySlides: StorySlide[] = [
  {
    image: '/assets/Elegant_Macarons_on_Pink_Background-min-e530fafc-a14b-42cc-ae3e-8a630212d646.png',
    title: 'Get discovered by people who are ready to buy',
    titleAr: 'اكتشف من قبل الأشخاص المستعدين للشراء',
    subtitle: 'Haady turns gifting moments into real orders.',
    subtitleAr: 'هادي يحول لحظات الهدايا إلى طلبات حقيقية.',
    paragraph: 'Customers come to Haady with a clear intent: send something thoughtful now. Your store appears in curated categories and smart recommendations, helping you reach high-quality buyers without relying only on ads.',
    paragraphAr: 'يأتي العملاء إلى هادي بنية واضحة: إرسال شيء مدروس الآن. يظهر متجرك في فئات مختارة وتوصيات ذكية، مما يساعدك على الوصول إلى مشترين عاليي الجودة دون الاعتماد فقط على الإعلانات.',
    titleMaxWidth: 'max-w-2xl',
  },
  {
    image: '/assets/Elegant_Noir_Coffee_Zenith-min-ff76a843-53b8-427e-843f-e177050c9207.png',
    title: 'More conversions, less checkout drop-off',
    titleAr: 'مزيد من التحويلات، تقليل التخلي عند الدفع',
    subtitle: 'Customers can send gifts using a username.',
    subtitleAr: 'يمكن للعملاء إرسال الهدايا باستخدام اسم المستخدم.',
    paragraph: 'Haady removes the biggest gifting blocker—address collection. Buyers choose the gift, and the recipient confirms the delivery address and timing. That means fewer abandoned carts and a smoother purchase flow.',
    paragraphAr: 'هادي يزيل أكبر عائق للهدايا—جمع العنوان. يختار المشترون الهدية، ويؤكد المستلم عنوان التسليم والتوقيت. هذا يعني عدد أقل من عربات التسوق المهجورة وتدفق شراء أكثر سلاسة.',
    titleMaxWidth: 'max-w-2xl',
  },
  {
    image: '/assets/Rainbow_Handbag_Display-8a341ae0-6f46-4c73-b98f-82920b2c9b2f.png',
    title: 'Let Haady recommend your best products',
    titleAr: 'دع هادي يوصي بأفضل منتجاتك',
    subtitle: 'Personalized suggestions that match taste and occasion.',
    subtitleAr: 'اقتراحات مخصصة تطابق الذوق والمناسبة.',
    paragraph: 'Haady AI learns user preferences (brands, colors, personality, occasions) and surfaces the right items at the right time—so your products get shown to people most likely to buy.',
    paragraphAr: 'يتعلم ذكاء هادي الاصطناعي تفضيلات المستخدمين (العلامات التجارية، الألوان، الشخصية، المناسبات) ويعرض العناصر المناسبة في الوقت المناسب—حتى يتم عرض منتجاتك للأشخاص الأكثر احتمالاً للشراء.',
    titleMaxWidth: 'max-w-2xl',
  },
  {
    image: '/assets/Red_Transparent_Controller__1_-min-1c900b46-3b65-4958-87db-983fea6efdf3.png',
    title: 'Sync products automatically',
    titleAr: 'مزامنة المنتجات تلقائياً',
    subtitle: 'Keep catalog and inventory up to date.',
    subtitleAr: 'حافظ على الكتالوج والمخزون محدثين.',
    paragraph: 'Connect your e-commerce platform to import products, prices, images, and stock. When your inventory changes, Haady stays aligned—saving you manual updates and preventing out-of-stock orders.',
    paragraphAr: 'اربط منصة التجارة الإلكترونية الخاصة بك لاستيراد المنتجات والأسعار والصور والمخزون. عندما يتغير مخزونك، يبقى هادي متزامناً—يوفر عليك التحديثات اليدوية ويمنع الطلبات غير المتوفرة.',
    titleMaxWidth: 'max-w-xl',
  },
  {
    image: '/assets/Elegance_in_Beauty__A_Sophisticated_Cosmetic_Arrangement-ec51a58d-1f58-4097-a1b1-abd93c14ede7.png',
    title: 'Manage gift orders in one dashboard',
    titleAr: 'إدارة طلبات الهدايا في لوحة تحكم واحدة',
    subtitle: 'Track, prepare, and fulfill smoothly.',
    subtitleAr: 'تتبع، جهز، ونفذ بسلاسة.',
    paragraph: 'See new orders, confirm preparation, and follow fulfillment status from Haady Business. Clear order details and recipient instructions help your team fulfill faster with fewer mistakes.',
    paragraphAr: 'اطلع على الطلبات الجديدة، وأكد التحضير، وتابع حالة التنفيذ من هادي للأعمال. تفاصيل الطلب الواضحة وتعليمات المستلم تساعد فريقك على التنفيذ بشكل أسرع مع أخطاء أقل.',
    titleMaxWidth: 'max-w-2xl',
  },
  {
    image: '/assets/Heart-Shaped_Chocolates_Assortment-min-d7b5f509-fef2-490a-90fd-347c6944d256.png',
    title: 'Turn products into gift experiences',
    titleAr: 'حول المنتجات إلى تجارب هدايا',
    subtitle: 'Add gift options that increase basket size.',
    subtitleAr: 'أضف خيارات الهدايا التي تزيد حجم السلة.',
    paragraph: 'Offer add-ons like notes, wrapping, and curated bundles. Haady is built for gifting, so customers naturally buy extras—helping you increase average order value.',
    paragraphAr: 'قدم الإضافات مثل الملاحظات والتغليف والحزم المختارة. هادي مبني للهدايا، لذلك يشتري العملاء بشكل طبيعي إضافات—مما يساعدك على زيادة متوسط قيمة الطلب.',
    titleMaxWidth: 'max-w-2xl',
  },
]

const SLIDE_DURATION = 10000
const LAST_SLIDE_DURATION = 18000 // Longer duration for notification preview animation

const PRODUCTS_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts'
const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

const notifications = [
  {
    id: 1,
    title: "You've got a gift 🎁",
    titleAr: 'لديك هدية 🎁',
    description: 'Open Haady to see who sent it.',
    descriptionAr: 'افتح هادي لمعرفة من أرسلها.',
    timestamp: '2m ago',
    timestampAr: 'منذ دقيقتين',
    productImage: `${PRODUCTS_STORAGE_URL}/coffee-machine.png`,
  },
  {
    id: 2,
    title: "You've got a gift",
    titleAr: 'لديك هدية',
    description: 'Ahmed sent you a special surprise',
    descriptionAr: 'أرسل لك أحمد مفاجأة خاصة',
    timestamp: '5m ago',
    timestampAr: 'منذ 5 دقائق',
    productImage: `${PRODUCTS_STORAGE_URL}/headphones.png`,
  },
  {
    id: 3,
    title: "You've got a gift",
    titleAr: 'لديك هدية',
    description: 'Fatima sent you a thoughtful present',
    descriptionAr: 'أرسلت لك فاطمة هدية مدروسة',
    timestamp: '10m ago',
    timestampAr: 'منذ 10 دقائق',
    productImage: `${PRODUCTS_STORAGE_URL}/lipstick.png`,
  },
  {
    id: 4,
    title: "You've got a gift",
    titleAr: 'لديك هدية',
    description: 'Mohammed sent you an elegant gift',
    descriptionAr: 'أرسل لك محمد هدية أنيقة',
    timestamp: '15m ago',
    timestampAr: 'منذ 15 دقيقة',
    productImage: `${PRODUCTS_STORAGE_URL}/perfume.png`,
  },
]

export function OnboardingStorySlider() {
  const { locale, isRTL } = useLocale()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isManuallyPaused, setIsManuallyPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [visibleNotifications, setVisibleNotifications] = useState<number[]>([])
  const [hoveredNotificationId, setHoveredNotificationId] = useState<number | null>(null)
  const [isAutoPreview, setIsAutoPreview] = useState(false)
  const [autoPreviewIndex, setAutoPreviewIndex] = useState(0)
  const autoPreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const isManualNavigationRef = useRef<boolean>(false)
  const notificationHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentSlide = storySlides[currentIndex]
  const totalSlides = storySlides.length

  // Go to next slide
  const goToNext = useCallback(() => {
    isManualNavigationRef.current = true
    setProgress(10)
    pausedAtRef.current = 10
    setCurrentIndex((prev) => (prev + 1) % totalSlides)
  }, [totalSlides])

  // Go to previous slide
  const goToPrevious = useCallback(() => {
    isManualNavigationRef.current = true
    setProgress(10)
    pausedAtRef.current = 10
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
  }, [totalSlides])

  // Get duration for current slide
  const getCurrentSlideDuration = useCallback(() => {
    return currentIndex === totalSlides - 1 ? LAST_SLIDE_DURATION : SLIDE_DURATION
  }, [currentIndex, totalSlides])

  // Animation loop
  const animate = useCallback(() => {
    if (isPaused) return

    const duration = currentIndex === totalSlides - 1 ? LAST_SLIDE_DURATION : SLIDE_DURATION
    const elapsed = Date.now() - startTimeRef.current
    const newProgress = Math.min((elapsed / duration) * 100, 100)
    
    setProgress(newProgress)

    if (newProgress >= 100) {
      goToNext()
    } else {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [isPaused, goToNext, currentIndex, totalSlides])

  // Start/restart animation when slide changes or pause state changes
  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (isPaused) {
      // Store current progress when pausing
      pausedAtRef.current = progress
      return
    }

    // Calculate start time based on current progress (for resume)
    const duration = getCurrentSlideDuration()
    const progressTime = (pausedAtRef.current / 100) * duration
    startTimeRef.current = Date.now() - progressTime

    // Start animation
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [currentIndex, isPaused, animate, getCurrentSlideDuration])

  // Reset progress when slide changes
  useEffect(() => {
    const duration = getCurrentSlideDuration()
    if (isManualNavigationRef.current) {
      // Manual navigation - start from 10%
      setProgress(10)
      pausedAtRef.current = 10
      const progressTime = (10 / 100) * duration
      startTimeRef.current = Date.now() - progressTime
      isManualNavigationRef.current = false
    } else {
      // Auto-advance - start from 0%
      setProgress(0)
      pausedAtRef.current = 0
      startTimeRef.current = Date.now()
    }
  }, [currentIndex, getCurrentSlideDuration])

  // Show notifications one by one
  useEffect(() => {
    setVisibleNotifications([])
    setHoveredNotificationId(null)
    setIsAutoPreview(false)
    setAutoPreviewIndex(0)
    
    if (notificationHoverTimeoutRef.current) {
      clearTimeout(notificationHoverTimeoutRef.current)
      notificationHoverTimeoutRef.current = null
    }
    if (autoPreviewTimeoutRef.current) {
      clearTimeout(autoPreviewTimeoutRef.current)
      autoPreviewTimeoutRef.current = null
    }
    
    const timers: NodeJS.Timeout[] = []
    notifications.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleNotifications((prev) => [...prev, notifications[index].id])
        
        // Start auto-preview after second notification appears
        if (index === 1) {
          setTimeout(() => {
            setIsAutoPreview(true)
          }, 2000) // Wait a bit after second notification
        }
      }, 500 + index * 400) // First after 0.5s, then every 400ms
      timers.push(timer)
    })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
      if (notificationHoverTimeoutRef.current) {
        clearTimeout(notificationHoverTimeoutRef.current)
        notificationHoverTimeoutRef.current = null
      }
      if (autoPreviewTimeoutRef.current) {
        clearTimeout(autoPreviewTimeoutRef.current)
        autoPreviewTimeoutRef.current = null
      }
    }
  }, [currentIndex])

  // Auto-preview cycle - only once
  useEffect(() => {
    if (!isAutoPreview || currentIndex !== storySlides.length - 1) return
    
    // Stop if we've gone through all notifications
    if (autoPreviewIndex >= notifications.length) {
      setIsAutoPreview(false)
      setHoveredNotificationId(null)
      return
    }
    
    const notificationToPreview = notifications[autoPreviewIndex]
    
    // Only preview if notification is already visible
    if (!visibleNotifications.includes(notificationToPreview.id)) {
      // Wait and check again
      autoPreviewTimeoutRef.current = setTimeout(() => {
        setAutoPreviewIndex(autoPreviewIndex) // Re-trigger effect
      }, 200)
      return
    }
    
    // Set the current notification as hovered
    setHoveredNotificationId(notificationToPreview.id)
    
    // Schedule next preview
    autoPreviewTimeoutRef.current = setTimeout(() => {
      setAutoPreviewIndex((prev) => prev + 1)
    }, 2500) // Show each preview for 2.5 seconds
    
    return () => {
      if (autoPreviewTimeoutRef.current) {
        clearTimeout(autoPreviewTimeoutRef.current)
        autoPreviewTimeoutRef.current = null
      }
    }
  }, [isAutoPreview, autoPreviewIndex, currentIndex, visibleNotifications])

  // Calculate bar progress for each slide
  const getBarProgress = (index: number) => {
    if (index < currentIndex) {
      return 100 // Completed slides
    } else if (index === currentIndex) {
      return progress // Current slide
    } else {
      return 0 // Future slides
    }
  }

  // Toggle pause function
  const togglePause = useCallback(() => {
    setIsManuallyPaused(prev => !prev)
  }, [])

  // Handle external pause toggle
  useEffect(() => {
    const handleTogglePause = () => {
      togglePause()
    }
    
    const container = document.querySelector('[data-slider-container]')
    if (container) {
      container.addEventListener('togglePause', handleTogglePause)
      return () => {
        container.removeEventListener('togglePause', handleTogglePause)
      }
    }
  }, [togglePause])

  // Combine manual pause with hover pause
  useEffect(() => {
    // If manually paused, stay paused regardless of hover
    // Otherwise, pause on hover
    if (isManuallyPaused) {
      setIsPaused(true)
    }
  }, [isManuallyPaused])

  return (
    <div 
      data-slider-container
      className="relative w-full h-full overflow-hidden group"
      onMouseEnter={() => {
        if (!isManuallyPaused) {
          setIsPaused(true)
        }
      }}
      onMouseLeave={() => {
        if (!isManuallyPaused) {
          setIsPaused(false)
        }
      }}
    >
      {/* Background Image - instant change */}
      <div key={currentIndex} className="absolute inset-0 overflow-hidden">
        <img
          src={currentSlide.image}
          alt={currentSlide.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:blur-sm group-hover:scale-110"
        />
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Progress bars at top */}
      <div 
        className="absolute top-12 left-12 right-12 z-10 flex gap-2"
      >
        {storySlides.map((_, index) => (
          <div 
            key={index} 
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: `${getBarProgress(index)}%`,
                transformOrigin: 'left',
                marginLeft: '0',
              }}
            />
          </div>
        ))}
      </div>

      {/* iOS-style Notifications - Only show on last slide */}
      {currentIndex === totalSlides - 1 && (
      <motion.div 
        className="absolute inset-0 z-40 w-full flex flex-col items-center justify-center pointer-events-none"
        initial={false}
        animate={{ 
          gap: hoveredNotificationId ? 6 : 12 
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 35 
        }}
      >
        <AnimatePresence>
          {notifications.map((notification) => {
            const isVisible = visibleNotifications.includes(notification.id)
            const isHovered = hoveredNotificationId === notification.id
            const hasHovered = hoveredNotificationId !== null
            const shouldMute = hasHovered && !isHovered
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 400, scale: 1 }}
                animate={isVisible ? { 
                  opacity: shouldMute ? 0.4 : 1, 
                  y: 0,
                  scale: shouldMute ? 0.96 : 1,
                  filter: shouldMute ? 'blur(1px)' : 'blur(0px)'
                } : { 
                  opacity: 0, 
                  y: 400,
                  scale: 1
                }}
                exit={{ opacity: 0, y: 400, scale: 1 }}
                transition={{ 
                  duration: 0.6,
                  ease: [0.25, 0.1, 0.25, 1],
                  opacity: { duration: 0.25 },
                  scale: { type: "spring", stiffness: 400, damping: 30 },
                  filter: { duration: 0.25 }
                }}
                onMouseEnter={() => {
                  if (notificationHoverTimeoutRef.current) {
                    clearTimeout(notificationHoverTimeoutRef.current)
                    notificationHoverTimeoutRef.current = null
                  }
                  if (autoPreviewTimeoutRef.current) {
                    clearTimeout(autoPreviewTimeoutRef.current)
                    autoPreviewTimeoutRef.current = null
                  }
                  setIsAutoPreview(false)
                  setHoveredNotificationId(notification.id)
                }}
                onMouseLeave={() => {
                  notificationHoverTimeoutRef.current = setTimeout(() => {
                    setHoveredNotificationId(null)
                  }, 100)
                }}
                style={{ width: isHovered ? 320 : 400 }}
                className="bg-white/15 backdrop-blur-2xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] cursor-pointer hover:bg-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] pointer-events-auto transition-[width] duration-300 ease-out"
              >
                {/* Expanded Image Section - animates height */}
                <motion.div 
                  className="w-full relative overflow-hidden rounded-t-2xl bg-white"
                  initial={false}
                  animate={{ 
                    height: isHovered ? 200 : 0,
                    opacity: isHovered ? 1 : 0
                  }}
                  transition={{ 
                    height: { 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 40,
                      mass: 1
                    },
                    opacity: { duration: 0.2, ease: "easeOut" }
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <Image
                      src={notification.productImage}
                      alt="Product Preview"
                      width={160}
                      height={160}
                      className="w-40 h-40 object-contain"
                      unoptimized
                    />
                  </div>
                </motion.div>

                {/* Notification Content */}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Apple-style App Icon with Avatar */}
                    <motion.div 
                      className="flex-shrink-0 rounded-[12px] bg-gradient-to-br from-white to-gray-100 shadow-lg flex items-center justify-center relative"
                      initial={false}
                      animate={{ 
                        width: isHovered ? 40 : 48,
                        height: isHovered ? 40 : 48,
                        borderRadius: isHovered ? 10 : 12
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 500, 
                        damping: 35 
                      }}
                    >
                      <Image
                        src={HAADY_LOGO_URL}
                        alt="Haady"
                        width={28}
                        height={28}
                        className={isHovered ? "w-6 h-6" : "w-7 h-7"}
                        unoptimized
                      />
                      {/* Avatar Circle - shows on hover */}
                      <motion.div
                        className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                        initial={false}
                        animate={{
                          scale: isHovered ? 1 : 0,
                          opacity: isHovered ? 1 : 0
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                          delay: isHovered ? 0.1 : 0
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {(locale === 'ar' ? notification.descriptionAr : notification.description)?.split(' ')[0]?.[0]?.toUpperCase() || 'A'}
                        </span>
                      </motion.div>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h4 className="text-sm font-semibold text-white">
                          {locale === 'ar' ? notification.titleAr : notification.title}
                        </h4>
                        <motion.span 
                          className="text-xs text-white/80 flex-shrink-0"
                          initial={false}
                          animate={{ opacity: isHovered ? 0 : 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          {locale === 'ar' ? notification.timestampAr : notification.timestamp}
                        </motion.span>
                      </div>
                      <p className="text-xs text-white/90 leading-relaxed">
                        {locale === 'ar' ? notification.descriptionAr : notification.description}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Footer - animates in */}
                  <motion.div 
                    className="overflow-hidden"
                    initial={false}
                    animate={{ 
                      height: isHovered ? 'auto' : 0,
                      opacity: isHovered ? 1 : 0,
                      marginTop: isHovered ? 12 : 0
                    }}
                    transition={{ 
                      height: { 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 40 
                      },
                      opacity: { duration: 0.2, delay: isHovered ? 0.05 : 0 },
                      marginTop: { 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 40 
                      }
                    }}
                  >
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="text-xs text-white/60">
                        {locale === 'ar' ? notification.timestampAr : notification.timestamp}
                      </span>
                      <motion.span 
                        className="text-xs text-white font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {locale === 'ar' ? 'قبول الهدية' : 'Accept Gift'}
                      </motion.span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
      )}

      {/* Tap zones for navigation (Instagram-style) */}
      <div className="absolute inset-0 z-20 flex">
        <button
          onClick={goToPrevious}
          className="w-1/3 h-full cursor-pointer focus:outline-none order-1"
          aria-label="Previous slide"
        />
        {/* Center zone - toggle pause */}
        <button
          onClick={togglePause}
          className="w-1/3 h-full cursor-pointer focus:outline-none order-2"
          aria-label="Toggle pause"
        />
        <button
          onClick={goToNext}
          className="w-1/3 h-full cursor-pointer focus:outline-none order-3"
          aria-label="Next slide"
        />
      </div>

      {/* Center Pause/Play Icon - Instagram reels style */}
      <AnimatePresence>
        {isManuallyPaused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm">
              <Play className="w-10 h-10 text-white" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Content - Last 40% of height */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] z-20 pl-12 pr-12 py-8 md:pl-16 md:pr-16 md:py-12 flex items-center justify-center pointer-events-none">
        <div className="text-white max-w-3xl text-center mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <AnimatePresence mode="wait">
            <motion.h2
              key={`title-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight ${currentSlide.titleMaxWidth || 'max-w-2xl'} mx-auto`}
              style={locale === 'ar' ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' } : undefined}
            >
              {locale === 'ar' ? (currentSlide.titleAr || currentSlide.title) : currentSlide.title}
            </motion.h2>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={`subtitle-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="text-lg md:text-xl lg:text-2xl text-white font-medium mb-4 leading-relaxed"
              style={locale === 'ar' ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' } : undefined}
            >
              {locale === 'ar' ? (currentSlide.subtitleAr || currentSlide.subtitle) : currentSlide.subtitle}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={`paragraph-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="text-lg md:text-xl text-white/90 leading-relaxed font-light"
              style={locale === 'ar' ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' } : undefined}
            >
              {locale === 'ar' ? (currentSlide.paragraphAr || currentSlide.paragraph) : currentSlide.paragraph}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
