'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { useLocalizedUrl } from '@/lib/use-localized-url';
import { useAuth } from '@/lib/auth/auth-context';
import { useLoading } from '@/lib/loading-context';
import { parseLocaleCountry } from '@/lib/localized-url';
import { PlatformHeader } from '@/components/platform-header';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Gift,
  Globe2,
  Layers,
  Link as LinkIcon,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  Users2,
  X,
  Star,
} from 'lucide-react';
import { ArrowUpDown } from '@/components/animate-ui/icons/arrow-up-down';
import { Link as AnimatedLink } from '@/components/animate-ui/icons/link';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import Lenis from 'lenis';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';
const PRODUCTS_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts';
const BRANDS_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/brands';

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
];

interface Country {
  id: string;
  name: string;
  iso2: string;
  iso3?: string;
  phone_code?: string;
  flag_url?: string;
  currency_icon?: string;
}

export default function LandingPage() {
  const t = useTranslations();
  const { isRTL, locale, setLocale } = useLocale();
  const { localizedUrl } = useLocalizedUrl();
  const { user, signOut } = useAuth();
  const { setLoading } = useLoading();
  const pathname = usePathname();
  const homeUrl = localizedUrl('/');
  const [countries, setCountries] = useState<Country[]>([]);
  const [currentCountry, setCurrentCountry] = useState<Country | null>(null);
  const [visibleNotifications, setVisibleNotifications] = useState<number[]>([]);
  const [hoveredNotificationId, setHoveredNotificationId] = useState<number | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollbarHeight, setScrollbarHeight] = useState(10);
  const [currentProductIndex, setCurrentProductIndex] = useState(2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [expandedCardPosition, setExpandedCardPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredFeatureCard, setHoveredFeatureCard] = useState<number | null>(null);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [isInstantTransition, setIsInstantTransition] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<{
    product: typeof baseProducts[0];
    contact: typeof contacts[0];
    position: { x: number; y: number } | null;
  } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('mastercard');
  const [showGiftConfirmation, setShowGiftConfirmation] = useState<{
    product: typeof baseProducts[0];
    contact: typeof contacts[0];
    position: { x: number; y: number } | null;
  } | null>(null);

  // Mock contacts for gift recipient selection
  const contacts = useMemo(() => [
    { id: 1, name: 'Sarah Ahmed', username: '@sarah_ahmed', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
    { id: 2, name: 'Mohammed Ali', username: '@mo_ali', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
    { id: 3, name: 'Fatima Hassan', username: '@fatima.h', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
  ], []);

  // Compute currency from current country
  const currency = useMemo(() => {
    if (currentCountry?.currency_icon?.trim()) {
      return currentCountry.currency_icon.trim();
    }
    // Fallback based on locale
    return locale === 'ar' ? 'ر.س' : '$';
  }, [currentCountry?.currency_icon, locale]);

  // Check if currency is a URL (image/SVG)
  const isCurrencyImage = useMemo(() => {
    return currency && (currency.startsWith('http://') || currency.startsWith('https://'));
  }, [currency]);

  // Product data for carousel
  const baseProducts = useMemo(() => [
    {
      id: 1,
      image: `${PRODUCTS_STORAGE_URL}/coffee-machine.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/Nespresso.png`,
      brandName: 'Nespresso',
      title: locale === 'ar' ? 'آلة قهوة إسبريسو' : 'Premium Espresso Machine',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '٢٩٩' : '299',
      storeLogo: `${BRANDS_STORAGE_URL}/Nespresso.png`,
      storeName: locale === 'ar' ? 'متجر نيسبرسو' : 'Nespresso Store',
      category: locale === 'ar' ? 'إلكترونيات' : 'Electronics',
      rating: 4.5,
    },
    {
      id: 2,
      image: `${PRODUCTS_STORAGE_URL}/headphones.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/Sony.png`,
      brandName: 'Sony',
      title: locale === 'ar' ? 'سماعات رأس لاسلكية' : 'Wireless Headphones',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '١٩٩' : '199',
      storeLogo: `${BRANDS_STORAGE_URL}/Sony.png`,
      storeName: locale === 'ar' ? 'متجر سوني' : 'Sony Store',
      category: locale === 'ar' ? 'إلكترونيات' : 'Electronics',
      rating: 4.7,
    },
    {
      id: 3,
      image: `${PRODUCTS_STORAGE_URL}/lipstick.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/Dior.png`,
      brandName: 'Dior',
      title: locale === 'ar' ? 'أحمر شفاه فاخر' : 'Luxury Lipstick',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '٧٩' : '79',
      storeLogo: `${BRANDS_STORAGE_URL}/Dior.png`,
      storeName: locale === 'ar' ? 'متجر ديور' : 'Dior Beauty',
      category: locale === 'ar' ? 'تجميل' : 'Beauty',
      rating: 4.6,
    },
    {
      id: 4,
      image: `${PRODUCTS_STORAGE_URL}/watch.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/Rolex.png`,
      brandName: 'Rolex',
      title: locale === 'ar' ? 'ساعة كرونوغراف' : 'Chronograph Watch',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '٤٩٩' : '499',
      storeLogo: `${BRANDS_STORAGE_URL}/Rolex.png`,
      storeName: locale === 'ar' ? 'متجر رولكس' : 'Rolex Timepieces',
      category: locale === 'ar' ? 'ساعات' : 'Watches',
      rating: 4.8,
    },
    {
      id: 5,
      image: `${PRODUCTS_STORAGE_URL}/perfume.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/chanelpng.png`,
      brandName: 'Chanel',
      title: locale === 'ar' ? 'عطر فاخر' : 'Luxury Perfume',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '١٤٩' : '149',
      storeLogo: `${BRANDS_STORAGE_URL}/chanelpng.png`,
      storeName: locale === 'ar' ? 'متجر شانيل' : 'Chanel Fragrances',
      category: locale === 'ar' ? 'عطور' : 'Perfumes',
      rating: 4.4,
    },
    {
      id: 6,
      image: `${PRODUCTS_STORAGE_URL}/sneaker.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/nike.png`,
      brandName: 'Nike',
      title: locale === 'ar' ? 'حذاء رياضي' : 'Athletic Sneaker',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '١٧٩' : '179',
      storeLogo: `${BRANDS_STORAGE_URL}/nike.png`,
      storeName: locale === 'ar' ? 'متجر نايك' : 'Nike Store',
      category: locale === 'ar' ? 'أحذية' : 'Shoes',
      rating: 4.5,
    },
    {
      id: 7,
      image: `${PRODUCTS_STORAGE_URL}/iphone16.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/apple.png`,
      brandName: 'Apple',
      title: locale === 'ar' ? 'هاتف آيفون 16' : 'iPhone 16',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '٩٩٩' : '999',
      storeLogo: `${BRANDS_STORAGE_URL}/apple.png`,
      storeName: locale === 'ar' ? 'متجر أبل' : 'Apple Store',
      category: locale === 'ar' ? 'إلكترونيات' : 'Electronics',
      rating: 4.9,
    },
    {
      id: 8,
      image: `${PRODUCTS_STORAGE_URL}/lv-bag.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/lv.png`,
      brandName: 'Louis Vuitton',
      title: locale === 'ar' ? 'حقيبة يد فاخرة' : 'Luxury Handbag',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '١٢٩٩' : '1299',
      storeLogo: `${BRANDS_STORAGE_URL}/lv.png`,
      storeName: locale === 'ar' ? 'متجر لويس فويتون' : 'Louis Vuitton',
      category: locale === 'ar' ? 'حقائب' : 'Handbags',
      rating: 4.7,
    },
    {
      id: 9,
      image: `${PRODUCTS_STORAGE_URL}/xbox-black.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/microsoft.png`,
      brandName: 'Microsoft',
      title: locale === 'ar' ? 'جهاز ألعاب إكس بوكس' : 'Xbox Gaming Console',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '٤٩٩' : '499',
      storeLogo: `${BRANDS_STORAGE_URL}/microsoft.png`,
      storeName: locale === 'ar' ? 'متجر مايكروسوفت' : 'Microsoft Store',
      category: locale === 'ar' ? 'ألعاب' : 'Gaming',
      rating: 4.6,
    },
    {
      id: 10,
      image: `${PRODUCTS_STORAGE_URL}/high-heel.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/jimmy-choo.png`,
      brandName: 'Jimmy Choo',
      title: locale === 'ar' ? 'كعب عالي أنيق' : 'Elegant High Heels',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '٣٩٩' : '399',
      storeLogo: `${BRANDS_STORAGE_URL}/jimmy-choo.png`,
      storeName: locale === 'ar' ? 'متجر جيمي تشو' : 'Jimmy Choo',
      category: locale === 'ar' ? 'أحذية' : 'Shoes',
      rating: 4.5,
    },
    {
      id: 11,
      image: `${PRODUCTS_STORAGE_URL}/dumbbell.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/proform.png`,
      brandName: 'ProForm',
      title: locale === 'ar' ? 'أثقال رياضية' : 'Dumbbell Set',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '١٩٩' : '199',
      storeLogo: `${BRANDS_STORAGE_URL}/proform.png`,
      storeName: locale === 'ar' ? 'متجر بروفورم' : 'ProForm Fitness',
      category: locale === 'ar' ? 'رياضة' : 'Sports',
      rating: 4.4,
    },
    {
      id: 12,
      image: `${PRODUCTS_STORAGE_URL}/lego-car.png`,
      brandLogo: `${BRANDS_STORAGE_URL}/legopng.png`,
      brandName: 'LEGO',
      title: locale === 'ar' ? 'سيارة ليغو' : 'LEGO Car Set',
      description: locale === 'ar' ? 'مثال على منتج جاهز للإهداء' : 'Ready to gift',
      price: locale === 'ar' ? '١٤٩' : '149',
      storeLogo: `${BRANDS_STORAGE_URL}/legopng.png`,
      storeName: locale === 'ar' ? 'متجر ليغو' : 'LEGO Store',
      category: locale === 'ar' ? 'ألعاب' : 'Toys',
      rating: 4.6,
    },
  ], [locale]);

  // Simple carousel
  const CARD_WIDTH = 248; // 240px card + 8px gap

  // Auto-rotate carousel
  useEffect(() => {
    // Don't auto-rotate if modal is open or carousel is hovered
    if (expandedCardId || showGiftConfirmation || isCarouselHovered) return;
    
    const interval = setInterval(() => {
      setCurrentProductIndex(prev => {
        // Loop back to start when reaching the end
        if (prev >= baseProducts.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(interval);
  }, [expandedCardId, showGiftConfirmation, isCarouselHovered, baseProducts.length]);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      syncTouch: false,
    });

    // Calculate scrollbar height
    const calculateScrollbarHeight = () => {
      const viewportHeight = window.innerHeight;
      const contentHeight = document.documentElement.scrollHeight;
      const heightRatio = viewportHeight / contentHeight;
      const scrollbarHeightPercent = Math.max(8, Math.min(100, heightRatio * 100));
      setScrollbarHeight(scrollbarHeightPercent);
    };

    // Use ref to avoid state updates causing re-renders during scroll
    let currentProgress = 0;
    const handleScroll = ({ progress }: { progress: number }) => {
      currentProgress = progress;
      setScrollProgress(progress);
    };
    
    lenis.on('scroll', handleScroll);
    
    // Initial calculations
    calculateScrollbarHeight();
    setTimeout(calculateScrollbarHeight, 1000);
    
    window.addEventListener('resize', calculateScrollbarHeight);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Handle anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href*="#"]');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href.includes('#')) {
          const hash = href.split('#')[1];
          if (hash) {
            const element = document.getElementById(hash) || document.querySelector(`[id="${hash}"]`);
            if (element) {
              e.preventDefault();
              lenis.scrollTo(element, { offset: -80 });
            }
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);

    return () => {
      lenis.destroy();
      window.removeEventListener('resize', calculateScrollbarHeight);
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, []);


  // Fetch countries from database
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/countries');
        if (!response.ok) {
          throw new Error('Failed to fetch countries');
        }
        const { countries: countriesData } = await response.json();
        if (countriesData && countriesData.length > 0) {
          setCountries(countriesData);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    fetchCountries();
  }, []);

  // Update current country when URL changes
  useEffect(() => {
    if (countries.length === 0) return;
    
    const urlCountry = parseLocaleCountry(pathname);
    let countryToSet: Country | null = null;
    
    if (urlCountry?.country) {
      countryToSet = countries.find(
        (c: Country) => c.iso2.toUpperCase() === urlCountry.country.toUpperCase()
      ) || null;
    }
    
    // If no country from URL, use default (Saudi Arabia) or first available
    if (!countryToSet) {
      countryToSet = countries.find((c: Country) => c.iso2.toUpperCase() === 'SA') || countries[0] || null;
    }
    
    if (countryToSet && countryToSet.id !== currentCountry?.id) {
      setCurrentCountry(countryToSet);
    }
  }, [pathname, countries, currentCountry?.id]);

  // Show notifications with staggered delay
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    notifications.forEach((notification, index) => {
      const timer = setTimeout(() => {
        setVisibleNotifications((prev) => [...prev, notification.id]);
      }, index * 300 + 500);
      timers.push(timer);
    });
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);


  const handleLanguageToggle = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    setLoading(true);
    // Delay to ensure loading overlay is visible before switching
    setTimeout(() => {
      setLocale(newLocale);
    }, 1000);
  };


  const heroBullets = [
    {
      title: t('landing.hero.bullets.conversions').split(':')[0].trim(),
      subtitle: t('landing.hero.bullets.conversions').split(':')[1]?.trim() || '',
      icon: Users2,
      color: '#0EA5E9', // Blue
    },
    {
      title: t('landing.hero.bullets.autoSync').split(':')[0].trim(),
      subtitle: t('landing.hero.bullets.autoSync').split(':')[1]?.trim() || '',
      icon: Layers,
      color: '#10B981', // Green
    },
    {
      title: t('landing.hero.bullets.giftReady').split(':')[0].trim(),
      subtitle: t('landing.hero.bullets.giftReady').split(':')[1]?.trim() || '',
      icon: Gift,
      color: '#F4610B', // Orange
    },
    {
      title: t('landing.hero.bullets.dashboard').split(':')[0].trim(),
      subtitle: t('landing.hero.bullets.dashboard').split(':')[1]?.trim() || '',
      icon: Store,
      color: '#8B5CF6', // Purple
    },
  ];

  const proofPoints = [
    t('landing.socialProof.points.trusted'),
    t('landing.socialProof.points.seasons'),
    t('landing.socialProof.points.fulfillment'),
  ];

  const featureCards = [
    {
      icon: Users2,
      title: t('landing.features.items.username.title'),
      subtitle: t('landing.features.items.username.subtitle'),
      description: t('landing.features.items.username.description'),
    },
    {
      icon: Store,
      title: t('landing.features.items.catalog.title'),
      subtitle: t('landing.features.items.catalog.subtitle'),
      description: t('landing.features.items.catalog.description'),
    },
    {
      icon: Gift,
      title: t('landing.features.items.presentation.title'),
      subtitle: t('landing.features.items.presentation.subtitle'),
      description: t('landing.features.items.presentation.description'),
    },
    {
      icon: Layers,
      title: t('landing.features.items.management.title'),
      subtitle: t('landing.features.items.management.subtitle'),
      description: t('landing.features.items.management.description'),
    },
    {
      icon: Sparkles,
      title: t('landing.features.items.campaigns.title'),
      subtitle: t('landing.features.items.campaigns.subtitle'),
      description: t('landing.features.items.campaigns.description'),
    },
    {
      icon: Globe2,
      title: t('landing.features.items.insights.title'),
      subtitle: t('landing.features.items.insights.subtitle'),
      description: t('landing.features.items.insights.description'),
    },
  ];

  const outcomes = [
    t('landing.features.outcomes.abandoned'),
    t('landing.features.outcomes.aov'),
    t('landing.features.outcomes.delivery'),
    t('landing.features.outcomes.repeat'),
  ];

  const steps = [
    {
      title: t('landing.howItWorks.steps.profile.title'),
      description: t('landing.howItWorks.steps.profile.description'),
    },
    {
      title: t('landing.howItWorks.steps.connect.title'),
      description: t('landing.howItWorks.steps.connect.description'),
    },
    {
      title: t('landing.howItWorks.steps.launch.title'),
      description: t('landing.howItWorks.steps.launch.description'),
    },
  ];

  const integrations = [
    {
      title: t('landing.integrations.items.shopify.title'),
      description: t('landing.integrations.items.shopify.description'),
      logo: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/shopify-logo.png',
    },
    {
      title: t('landing.integrations.items.zid.title'),
      description: t('landing.integrations.items.zid.description'),
      logo: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/zid-logo.png',
    },
    {
      title: t('landing.integrations.items.salla.title'),
      description: t('landing.integrations.items.salla.description'),
      logo: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/salla-logo.png',
    },
    {
      title: 'WooCommerce',
      description: locale === 'ar' ? 'اربط متجر WooCommerce الخاص بك' : 'Connect your WooCommerce store',
      logo: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/woow-logo.png',
    },
    {
      title: 'Adobe Commerce',
      description: locale === 'ar' ? 'اربط متجر Adobe Commerce الخاص بك' : 'Connect your Adobe Commerce store',
      logo: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/adobe-comm.webp',
    },
    {
      title: 'OpenCart',
      description: locale === 'ar' ? 'اربط متجر OpenCart الخاص بك' : 'Connect your OpenCart store',
      logo: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/OpenCart.png',
    },
  ];

  const trustBullets = [
    t('landing.trust.items.confirm'),
    t('landing.trust.items.status'),
    t('landing.trust.items.coverage'),
    t('landing.trust.items.security'),
  ];

  const faqItems = [
    {
      question: t('landing.faq.items.address.question'),
      answer: t('landing.faq.items.address.answer'),
    },
    {
      question: t('landing.faq.items.coverage.question'),
      answer: t('landing.faq.items.coverage.answer'),
    },
    {
      question: t('landing.faq.items.products.question'),
      answer: t('landing.faq.items.products.answer'),
    },
    {
      question: t('landing.faq.items.control.question'),
      answer: t('landing.faq.items.control.answer'),
    },
    {
      question: t('landing.faq.items.brands.question'),
      answer: t('landing.faq.items.brands.answer'),
    },
    {
      question: t('landing.faq.items.delivery.question'),
      answer: t('landing.faq.items.delivery.answer'),
    },
    {
      question: t('landing.faq.items.pause.question'),
      answer: t('landing.faq.items.pause.answer'),
    },
  ];

  const successLinks = [
    {
      title: t('landing.header.successMenu.stories'),
      href: `${homeUrl}#success`,
    },
    {
      title: t('landing.header.successMenu.results'),
      href: `${homeUrl}#social-proof`,
    },
  ];

  return (
    <div className={`min-h-screen bg-white text-foreground ${isRTL ? '' : 'font-google-sans'} hide-scrollbar`}>
      {/* Custom Lenis Scrollbar */}
      <div className="fixed right-3 top-20 bottom-4 w-2 z-[9999] pointer-events-none">
        <div className="relative w-full h-full bg-gray-300/30 rounded-full overflow-hidden">
          <div
            className="absolute left-0 right-0 bg-gradient-to-b from-[#F4610B] to-[#d4550a] rounded-full shadow-lg"
            style={{
              height: `${scrollbarHeight}%`,
              top: `${scrollProgress * (100 - scrollbarHeight)}%`,
            }}
          />
        </div>
      </div>
      <div className="relative overflow-x-hidden">
        <div className="absolute -top-[278px] left-0 h-96 w-96 rounded-full bg-[#F4610B]/20 blur-3xl" />
        <div className="absolute right-0 -top-[190px] h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />

        <PlatformHeader
          variant="landing"
          homeUrl={homeUrl}
          currentCountry={currentCountry}
          onLanguageToggle={handleLanguageToggle}
        />

        <main>
          <section className="container mx-auto px-4 pt-64 pb-64 md:pt-56 md:pb-56 relative h-fit flex items-start">
            <div className="max-w-7xl mx-auto grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center w-full">
              <div 
                className={`space-y-4 max-w-[600px] ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <div>
                  <Badge className="w-fit bg-[#F4610B]/10 text-[#F4610B] text-sm px-4 py-1.5" variant="secondary">
                    {t('landing.hero.kicker')}
                  </Badge>
                </div>
                <h1 
                  className="text-4xl font-[750] leading-tight tracking-tight md:text-5xl"
                >
                  {locale === 'ar' ? 'منصة تجارة إلكترونية مخصّصة للهدايا - اجعل منتجاتك هدايا في كل مناسبة' : 'Gifting-native commerce for modern brands.'}
                </h1>
                <p 
                  className="text-xl text-gray-400 md:text-2xl leading-relaxed font-normal"
                >
                  {locale === 'ar' 
                    ? 'خلّ كتالوجك جاهز للإهداء على هادي — المشتري يشتري بسرعة، والمستلم يأكد تفاصيل التوصيل، وأنت تنفّذ الطلب بسهولة وبنسبة إكمال أعلى.'
                    : 'A gifting-native commerce channel that turns your catalog into shareable gifts—recipient-confirmed delivery, streamlined fulfillment.'}
                </p>
                <div 
                  className="mt-8 flex flex-wrap gap-4"
                >
                  <Button asChild size="lg" className="text-base px-8 h-[52px] rounded-xl bg-black text-white hover:bg-orange-500 transition-colors group">
                    <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {locale === 'en' && (
                        <AnimateIcon animateOnHover className="group-hover:animate-in">
                          <AnimatedLink className="h-4 w-4" />
                        </AnimateIcon>
                      )}
                      <span>{locale === 'ar' ? 'اربط متجرك' : 'Connect Your store'}</span>
                      {locale === 'ar' && (
                        <AnimateIcon animateOnHover className="group-hover:animate-in">
                          <AnimatedLink className="h-4 w-4" />
                        </AnimateIcon>
                      )}
                    </Link>
                  </Button>
                </div>
              </div>
              
              {/* Product Cards Carousel with Store Info */}
              <div className="hidden lg:block w-auto max-w-[600px]">
                {/* Product Cards Carousel */}
                <div className="flex flex-col">
                  {/* Store Information - Inside Carousel */}
                  {baseProducts[currentProductIndex] && (() => {
                    const currentProduct = baseProducts[currentProductIndex];
                    return (
                      <div className={`flex items-center gap-3 transition-all duration-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {/* Store Logo Box */}
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                          <Image
                            src={currentProduct.storeLogo || currentProduct.brandLogo}
                            alt={currentProduct.storeName || currentProduct.brandName}
                            width={48}
                            height={48}
                            className="object-contain rounded-xl"
                            unoptimized
                          />
                        </div>
                        {/* Store Details */}
                        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {currentProduct.storeName || currentProduct.brandName}
                            </span>
                            {/* Rating */}
                            <div className={`flex items-center gap-1 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium text-gray-700">
                                {currentProduct.rating?.toFixed(1) || '4.5'}
                              </span>
                            </div>
                          </div>
                          {/* Category */}
                          <span className="text-xs text-gray-500">
                            {currentProduct.category || 'General'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                <div
                  className="relative w-full h-[450px] overflow-hidden"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%), linear-gradient(to bottom, transparent 0%, black 60px, black calc(100% - 60px), transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%), linear-gradient(to bottom, transparent 0%, black 60px, black calc(100% - 60px), transparent 100%)',
                  maskComposite: 'intersect',
                  WebkitMaskComposite: 'intersect',
                }}
              >
                <div 
                  className="relative flex items-center justify-center h-full" 
                  dir="ltr"
                  onMouseEnter={() => setIsCarouselHovered(true)}
                  onMouseLeave={() => setIsCarouselHovered(false)}
                >
                  {/* Left navigation area */}
                  <div 
                    className="absolute left-0 top-0 w-20 h-full z-20 cursor-pointer"
                    onClick={() => {
                      if (!isAnimating) {
                        setIsAnimating(true);
                        setCurrentProductIndex(prev => 
                          prev <= 0 ? baseProducts.length - 1 : prev - 1
                        );
                        setTimeout(() => setIsAnimating(false), 400);
                      }
                    }}
                  />
                  {/* Right navigation area */}
                  <div 
                    className="absolute right-0 top-0 w-20 h-full z-20 cursor-pointer"
                    onClick={() => {
                      if (!isAnimating) {
                        setIsAnimating(true);
                        setCurrentProductIndex(prev => 
                          prev >= baseProducts.length - 1 ? 0 : prev + 1
                        );
                        setTimeout(() => setIsAnimating(false), 400);
                      }
                    }}
                  />
                  <div 
                    className="flex items-center gap-2 transition-transform duration-400 ease-in-out"
                    style={{ 
                      transform: `translateX(${((baseProducts.length - 1) / 2 - currentProductIndex) * CARD_WIDTH}px)`,
                      transitionDuration: isInstantTransition ? '0ms' : '400ms'
                    }}
                  >
                    {/* Ghost cards from end (shown before first card) */}
                    {baseProducts.slice(-2).map((product, idx) => {
                      const actualIndex = baseProducts.length - 2 + idx; // Maps to actual last 2 products
                      const ghostIndex = idx - 2; // -2, -1
                      const distance = Math.abs(ghostIndex - currentProductIndex);
                      const isFocused = false; // Ghost cards are never focused
                      const opacity = isFocused ? 1 : distance === 1 ? 0.5 : distance === 2 ? 0.3 : 0.15;
                      const isVisible = currentProductIndex <= 1;
                      
                      return (
                        <div
                          key={`ghost-start-${product.id}`}
                          className={`relative flex-shrink-0 z-0 transition-opacity duration-300 group ${isVisible ? 'cursor-pointer' : 'pointer-events-none'}`}
                          style={{ opacity: isVisible ? opacity : 0 }}
                          onMouseEnter={() => {}}
                          onClick={() => {
                            if (isVisible && !isAnimating) {
                              setIsInstantTransition(true);
                              setCurrentProductIndex(actualIndex);
                              setTimeout(() => setIsInstantTransition(false), 50);
                            }
                          }}
                        >
                          <Card 
                            className={`relative overflow-hidden rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] border-0 bg-white w-[240px] h-auto flex flex-col grayscale transition-all duration-300 ${isVisible ? 'group-hover:shadow-[0_30px_80px_rgba(15,23,42,0.25)] group-hover:grayscale-0 group-hover:opacity-70' : ''}`}
                          >
                            <div className="relative h-[160px] bg-white flex items-center justify-center p-6">
                              <Image src={product.image} alt={product.title} width={130} height={130} className="object-contain" unoptimized />
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col">
                              <div className={`space-y-2 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {/* Brand Logo and Name */}
                                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                    <Image
                                      src={product.brandLogo}
                                      alt={product.brandName}
                                      width={24}
                                      height={24}
                                      className="object-contain rounded-full"
                                      unoptimized
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-700">{product.brandName}</span>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-base text-gray-900 truncate">{product.title}</h3>
                                  <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                                </div>
                              </div>
                              <div className={`flex items-center gap-2 pt-2 mt-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="flex items-center gap-1.5 text-xl font-bold text-gray-900">
                                  {isRTL ? (
                                    <>
                                      <span>{product.price}</span>
                                      {isCurrencyImage ? (
                                        <Image src={currency} alt="Currency" width={20} height={20} className="object-contain" unoptimized />
                                      ) : (
                                        <span>{currency}</span>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {isCurrencyImage ? (
                                        <Image src={currency} alt="Currency" width={20} height={20} className="object-contain" unoptimized />
                                      ) : (
                                        <span>{currency}</span>
                                      )}
                                      <span>{product.price}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button className="w-full mt-3 rounded-xl bg-[#F4610B] text-white" size="lg">
                                <Gift className={`${isRTL ? 'ml-2' : 'mr-2'}`} style={{ width: '24px', height: '24px' }} />
                                {locale === 'ar' ? 'إرسال هدية' : 'Send Gift'}
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                    
                    {/* Main cards */}
                    {baseProducts.map((product, index) => {
                      const isFocused = index === currentProductIndex;
                      const distance = Math.abs(index - currentProductIndex);
                      
                      // Opacity based on distance from center
                      const opacity = isFocused ? 1 : distance === 1 ? 0.5 : distance === 2 ? 0.3 : 0.15;
                      
                      return (
                        <div
                          key={product.id}
                          className={`relative flex-shrink-0 transition-opacity duration-300 group ${isFocused ? 'z-10' : 'z-0'}`}
                          style={{ opacity }}
                          onClick={() => {
                            if (!isFocused && !isAnimating) {
                              setIsAnimating(true);
                              setCurrentProductIndex(index);
                              setTimeout(() => setIsAnimating(false), 400);
                            }
                          }}
                        >
                      <Card 
                        data-card
                        className={`relative overflow-hidden rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] border-0 bg-white w-[240px] h-auto flex flex-col transition-all duration-300 cursor-pointer ${!isAnimating && isFocused ? 'group-hover:-translate-y-[16px]' : ''} ${!isAnimating && !isFocused ? 'group-hover:shadow-[0_30px_80px_rgba(15,23,42,0.25)] group-hover:grayscale-0 group-hover:opacity-70' : ''} ${!isFocused ? 'grayscale' : ''}`}
                      >
                        <div className="relative h-[160px] bg-white flex items-center justify-center p-6">
                          <Image
                            src={product.image}
                            alt={product.title}
                            width={130}
                            height={130}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <div className={`space-y-2 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {/* Brand Logo and Name */}
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                <Image
                                  src={product.brandLogo}
                                  alt={product.brandName}
                                  width={24}
                                  height={24}
                                  className="object-contain rounded-full"
                                  unoptimized
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{product.brandName}</span>
                            </div>
                            
                            {/* Product Title */}
                            <div>
                              <h3 className="font-semibold text-base text-gray-900 truncate">
                                {product.title}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {product.description}
                              </p>
                            </div>
                          </div>
                            
                            {/* Price */}
                            <div className={`flex items-center gap-2 pt-2 mt-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="flex items-center gap-1.5 text-xl font-bold text-gray-900">
                                {isRTL ? (
                                  <>
                                    <span>{product.price}</span>
                                    {isCurrencyImage ? (
                                      <Image
                                        src={currency}
                                        alt="Currency"
                                        width={20}
                                        height={20}
                                        className="object-contain"
                                        unoptimized
                                      />
                                    ) : (
                                      <span>{currency}</span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {isCurrencyImage ? (
                                      <Image
                                        src={currency}
                                        alt="Currency"
                                        width={20}
                                        height={20}
                                        className="object-contain"
                                        unoptimized
                                      />
                                    ) : (
                                      <span>{currency}</span>
                                    )}
                                    <span>{product.price}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Send Gift Button */}
                            <Button 
                              className="w-full mt-3 rounded-xl bg-[#F4610B] text-white hover:bg-[#F4610B]/90 transition-colors"
                              size="lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isFocused) {
                                  // Get the card element position
                                  const cardElement = (e.target as HTMLElement).closest('[data-card]');
                                  if (cardElement) {
                                    const rect = cardElement.getBoundingClientRect();
                                    setExpandedCardPosition({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top + rect.height / 2
                                    });
                                  }
                                  setExpandedCardId(product.id);
                                  setSelectedContact(null);
                                }
                              }}
                            >
                              <Gift className={`${isRTL ? 'ml-2' : 'mr-2'}`} style={{ width: '24px', height: '24px' }} />
                              {locale === 'ar' ? 'إرسال هدية' : 'Send Gift'}
                            </Button>
                        </CardContent>
                      </Card>
                        </div>
                      );
                    })}
                    
                    {/* Ghost cards from start (shown after last card) */}
                    {baseProducts.slice(0, 2).map((product, idx) => {
                      const actualIndex = idx; // Maps to actual first 2 products (0, 1)
                      const ghostIndex = baseProducts.length + idx; // 6, 7 (for 6 products)
                      const distance = Math.abs(ghostIndex - currentProductIndex);
                      const isFocused = false; // Ghost cards are never focused
                      const opacity = isFocused ? 1 : distance === 1 ? 0.5 : distance === 2 ? 0.3 : 0.15;
                      const isVisible = currentProductIndex >= baseProducts.length - 2;
                      
                      return (
                        <div
                          key={`ghost-end-${product.id}`}
                          className={`relative flex-shrink-0 z-0 transition-opacity duration-300 group ${isVisible ? 'cursor-pointer' : 'pointer-events-none'}`}
                          style={{ opacity: isVisible ? opacity : 0 }}
                          onClick={() => {
                            if (isVisible && !isAnimating) {
                              setIsInstantTransition(true);
                              setCurrentProductIndex(actualIndex);
                              setTimeout(() => setIsInstantTransition(false), 50);
                            }
                          }}
                        >
                          <Card 
                            className={`relative overflow-hidden rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] border-0 bg-white w-[240px] h-auto flex flex-col grayscale transition-all duration-300 ${isVisible ? 'group-hover:shadow-[0_30px_80px_rgba(15,23,42,0.25)] group-hover:grayscale-0 group-hover:opacity-70' : ''}`}
                          >
                            <div className="relative h-[160px] bg-white flex items-center justify-center p-6">
                              <Image src={product.image} alt={product.title} width={130} height={130} className="object-contain" unoptimized />
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col">
                              <div className={`space-y-2 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {/* Brand Logo and Name */}
                                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                    <Image
                                      src={product.brandLogo}
                                      alt={product.brandName}
                                      width={24}
                                      height={24}
                                      className="object-contain rounded-full"
                                      unoptimized
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-700">{product.brandName}</span>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-base text-gray-900 truncate">{product.title}</h3>
                                  <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                                </div>
                              </div>
                              <div className={`flex items-center gap-2 pt-2 mt-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="flex items-center gap-1.5 text-xl font-bold text-gray-900">
                                  {isRTL ? (
                                    <>
                                      <span>{product.price}</span>
                                      {isCurrencyImage ? (
                                        <Image src={currency} alt="Currency" width={20} height={20} className="object-contain" unoptimized />
                                      ) : (
                                        <span>{currency}</span>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {isCurrencyImage ? (
                                        <Image src={currency} alt="Currency" width={20} height={20} className="object-contain" unoptimized />
                                      ) : (
                                        <span>{currency}</span>
                                      )}
                                      <span>{product.price}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button className="w-full mt-3 rounded-xl bg-[#F4610B] text-white" size="lg">
                                <Gift className={`${isRTL ? 'ml-2' : 'mr-2'}`} style={{ width: '24px', height: '24px' }} />
                                {locale === 'ar' ? 'إرسال هدية' : 'Send Gift'}
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
            
          {/* Expanded Card Overlay - Outside masked container */}
            {expandedCardId && (() => {
              const expandedProduct = baseProducts.find(p => p.id === expandedCardId);
              if (!expandedProduct) return null;
              return (
                <>
                    {/* Expanded Card */}
                    <div
                      className="fixed z-[101] w-[580px] max-h-[85vh] bg-white rounded-3xl overflow-hidden flex shadow-[0_20px_60px_rgba(15,23,42,0.15)] transition-all duration-300"
                      style={{
                        left: expandedCardPosition?.x ?? '50%',
                        top: expandedCardPosition?.y ?? '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Left Side - Product Details */}
                      <div className="w-[260px] bg-white p-6 flex flex-col">
                        {/* Close Button */}
                        <button
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors z-10"
                          onClick={() => setExpandedCardId(null)}
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        {/* Product Image */}
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-[180px] h-[180px] bg-white rounded-2xl flex items-center justify-center p-4">
                            <Image
                              src={expandedProduct.image}
                              alt={expandedProduct.title}
                              width={150}
                              height={150}
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        </div>
                        
                        {/* Product Info */}
                        <div className="mt-4 space-y-2">
                          {/* Brand */}
                          <div className="flex items-center gap-2">
                            <Image
                              src={expandedProduct.brandLogo}
                              alt={expandedProduct.brandName}
                              width={20}
                              height={20}
                              className="object-contain rounded-full"
                              unoptimized
                            />
                            <span className="text-sm text-gray-600">{expandedProduct.brandName}</span>
                          </div>
                          
                          {/* Title */}
                          <h3 className="font-semibold text-lg text-gray-900">{expandedProduct.title}</h3>
                          
                          {/* Description */}
                          <p className="text-sm text-gray-500">{expandedProduct.description}</p>
                          
                          {/* Price */}
                          <div className="flex items-center gap-1 pt-2">
                            <span className="text-2xl font-bold text-[#F4610B]">
                              {isRTL ? `${expandedProduct.price} ${!isCurrencyImage ? currency : ''}` : `${!isCurrencyImage ? currency : ''}${expandedProduct.price}`}
                            </span>
                            {isCurrencyImage && (
                              <Image src={currency} alt="Currency" width={20} height={20} className="object-contain" unoptimized />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Side - Recipient Selection */}
                      <div className="flex-1 p-5 flex flex-col bg-gray-50">
                        <div className="flex items-center gap-2 mb-4">
                          <Gift className="w-5 h-5 text-[#F4610B]" />
                          <h4 className="font-semibold text-gray-900">
                            {locale === 'ar' ? 'اختر المستلم' : 'Select Recipient'}
                          </h4>
                        </div>
                        
                        {/* Contacts List */}
                        <div className="flex-1 overflow-y-auto space-y-2">
                          {contacts.map((contact) => (
                            <button
                              key={contact.id}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                selectedContact === contact.id
                                  ? 'bg-[#F4610B]/10 border-2 border-[#F4610B]'
                                  : 'hover:bg-gray-50 border-2 border-transparent'
                              }`}
                              onClick={() => setSelectedContact(contact.id)}
                            >
                              <div className="relative">
                                <Image
                                  src={contact.avatar}
                                  alt={contact.name}
                                  width={48}
                                  height={48}
                                  className="rounded-full object-cover"
                                  unoptimized
                                />
                                {selectedContact === contact.id && (
                                  <div
                                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#F4610B] rounded-full flex items-center justify-center"
                                  >
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium text-gray-900">{contact.name}</p>
                                <p className="text-xs text-gray-500">{contact.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        
                        {/* Send Button */}
                        <Button
                          className={`w-full h-12 rounded-xl text-white transition-all mt-4 ${
                            selectedContact
                              ? 'bg-[#F4610B] hover:bg-[#d4540a]'
                              : 'bg-gray-300 cursor-not-allowed'
                          }`}
                          disabled={!selectedContact}
                          onClick={() => {
                            if (selectedContact && expandedProduct) {
                              const contact = contacts.find(c => c.id === selectedContact);
                              if (contact) {
                                setShowPaymentModal({
                                  product: expandedProduct,
                                  contact: contact,
                                  position: expandedCardPosition
                                });
                                setSelectedPaymentMethod('mastercard');
                                setExpandedCardId(null);
                                setSelectedContact(null);
                              }
                            }
                          }}
                        >
                          <Gift className="w-5 h-5 mr-2" />
                          {locale === 'ar' ? 'إرسال الهدية' : 'Send Gift'}
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            
            {/* Payment Modal */}
              {showPaymentModal && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-black/30 z-[100]"
                    onClick={() => setShowPaymentModal(null)}
                  />
                  
                  {/* Payment Card */}
                  <div
                    className="fixed z-[101] w-[400px] bg-white rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.15)]"
                    style={{
                      left: showPaymentModal.position?.x ?? '50%',
                      top: showPaymentModal.position?.y ?? '50%',
                    }}
                  >
                    {/* Header */}
                    <div className="bg-gray-50 p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          {locale === 'ar' ? 'اختر طريقة الدفع' : 'Select Payment Method'}
                        </h3>
                        <button
                          className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
                          onClick={() => setShowPaymentModal(null)}
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Order Summary */}
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                          <Image
                            src={showPaymentModal.product.image}
                            alt={showPaymentModal.product.title}
                            width={40}
                            height={40}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{showPaymentModal.product.title}</p>
                          <p className="text-xs text-gray-500">
                            {locale === 'ar' ? 'هدية إلى' : 'Gift to'} {showPaymentModal.contact.name}
                          </p>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const isInstallment = selectedPaymentMethod === 'tabby' || selectedPaymentMethod === 'tamara';
                            const price = parseFloat(showPaymentModal.product.price);
                            const installmentAmount = isInstallment ? (price / 4).toFixed(2) : null;
                            
                            return (
                              <div>
                                {isInstallment ? (
                                  <>
                                    <p className="text-lg font-bold text-[#F4610B]">
                                      {isRTL ? `${installmentAmount} ${!isCurrencyImage ? currency : ''}` : `${!isCurrencyImage ? currency : ''}${installmentAmount}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {locale === 'ar' ? `من ${showPaymentModal.product.price}` : `of ${showPaymentModal.product.price}`}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-lg font-bold text-[#F4610B]">
                                    {isRTL ? `${showPaymentModal.product.price} ${!isCurrencyImage ? currency : ''}` : `${!isCurrencyImage ? currency : ''}${showPaymentModal.product.price}`}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {/* Saved Cards */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                          {locale === 'ar' ? 'البطاقات المحفوظة' : 'Saved Cards'}
                        </p>
                        <div className="space-y-2">
                          {/* Mastercard */}
                          <button 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                              selectedPaymentMethod === 'mastercard'
                                ? 'border-2 border-[#F4610B] bg-[#F4610B]/5'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedPaymentMethod('mastercard')}
                          >
                            <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center p-1">
                              <Image 
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" 
                                alt="Mastercard" 
                                width={40} 
                                height={24} 
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900 text-sm">•••• •••• •••• 8888</p>
                              <p className="text-xs text-gray-500">{locale === 'ar' ? 'تنتهي' : 'Expires'} 08/26</p>
                            </div>
                            {selectedPaymentMethod === 'mastercard' && (
                              <div className="w-5 h-5 rounded-full bg-[#F4610B] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Other Payment Methods */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                          {locale === 'ar' ? 'طرق دفع أخرى' : 'Other Methods'}
                        </p>
                        <div className="space-y-2">
                          {/* Apple Pay */}
                          <button 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                              selectedPaymentMethod === 'apple-pay'
                                ? 'border-2 border-[#F4610B] bg-[#F4610B]/5'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedPaymentMethod('apple-pay')}
                          >
                            <div className="w-12 h-8 rounded-lg flex items-center justify-center p-1 bg-white">
                              <Image 
                                src="https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/payment-methods/apple-pay.png" 
                                alt="Apple Pay" 
                                width={40} 
                                height={24} 
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900 text-sm">Apple Pay</p>
                              <p className="text-xs text-gray-500">{locale === 'ar' ? 'ادفع باستخدام Apple Pay' : 'Pay with Apple Pay'}</p>
                            </div>
                            {selectedPaymentMethod === 'apple-pay' && (
                              <div className="w-5 h-5 rounded-full bg-[#F4610B] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                          
                          {/* Mada */}
                          <button 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                              selectedPaymentMethod === 'mada'
                                ? 'border-2 border-[#F4610B] bg-[#F4610B]/5'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedPaymentMethod('mada')}
                          >
                            <div className="w-12 h-8 rounded-lg flex items-center justify-center p-1 bg-white">
                              <Image 
                                src="https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/payment-methods/mada.png" 
                                alt="Mada" 
                                width={40} 
                                height={24} 
                                className="object-contain"
                                unoptimized
                                onError={(e) => {
                                  // Fallback if image doesn't exist
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900 text-sm">{locale === 'ar' ? 'مدى' : 'Mada'}</p>
                              <p className="text-xs text-gray-500">{locale === 'ar' ? 'ادفع باستخدام مدى' : 'Pay with Mada'}</p>
                            </div>
                            {selectedPaymentMethod === 'mada' && (
                              <div className="w-5 h-5 rounded-full bg-[#F4610B] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                          
                          {/* Tabby */}
                          <button 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                              selectedPaymentMethod === 'tabby'
                                ? 'border-2 border-[#F4610B] bg-[#F4610B]/5'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedPaymentMethod('tabby')}
                          >
                            <div className="w-12 h-8 rounded-lg flex items-center justify-center p-1 bg-white">
                              <Image 
                                src="https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/payment-methods/tabby.png" 
                                alt="Tabby" 
                                width={40} 
                                height={24} 
                                className="object-contain"
                                unoptimized
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900 text-sm">Tabby</p>
                              <p className="text-xs text-gray-500">{locale === 'ar' ? 'ادفع على 4 أقساط' : 'Pay in 4 installments'}</p>
                            </div>
                            {selectedPaymentMethod === 'tabby' && (
                              <div className="w-5 h-5 rounded-full bg-[#F4610B] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                          
                          {/* Tamara */}
                          <button 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                              selectedPaymentMethod === 'tamara'
                                ? 'border-2 border-[#F4610B] bg-[#F4610B]/5'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedPaymentMethod('tamara')}
                          >
                            <div className="w-12 h-8 rounded-lg flex items-center justify-center p-1 bg-white">
                              <Image 
                                src="https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/payment-methods/tamara.png" 
                                alt="Tamara" 
                                width={40} 
                                height={24} 
                                className="object-contain"
                                unoptimized
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900 text-sm">Tamara</p>
                              <p className="text-xs text-gray-500">{locale === 'ar' ? 'ادفع على 4 أقساط' : 'Pay in 4 installments'}</p>
                            </div>
                            {selectedPaymentMethod === 'tamara' && (
                              <div className="w-5 h-5 rounded-full bg-[#F4610B] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Pay Button */}
                      <Button
                        className="w-full h-12 rounded-xl bg-[#F4610B] text-white hover:bg-[#d4540a] transition-colors"
                        onClick={() => {
                          // Complete payment and show success
                          setShowGiftConfirmation({
                            product: showPaymentModal.product,
                            contact: showPaymentModal.contact,
                            position: showPaymentModal.position
                          });
                          setShowPaymentModal(null);
                        }}
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {(() => {
                          const isInstallment = selectedPaymentMethod === 'tabby' || selectedPaymentMethod === 'tamara';
                          const price = parseFloat(showPaymentModal.product.price);
                          const displayAmount = isInstallment ? (price / 4).toFixed(2) : showPaymentModal.product.price;
                          
                          if (locale === 'ar') {
                            return isInstallment 
                              ? `ادفع ${displayAmount} ${!isCurrencyImage ? currency : ''} (${locale === 'ar' ? 'القسط الأول' : 'First installment'})`
                              : `ادفع ${displayAmount} ${!isCurrencyImage ? currency : ''}`;
                          } else {
                            return isInstallment
                              ? `Pay ${!isCurrencyImage ? currency : ''}${displayAmount} (First installment)`
                              : `Pay ${!isCurrencyImage ? currency : ''}${displayAmount}`;
                          }
                        })()}
                      </Button>
                      
                      {/* Security Note */}
                      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                        {locale === 'ar' ? 'دفع آمن ومشفر بواسطة Stripe' : 'Secure payment powered by Stripe'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            
            {/* Gift Sent Confirmation Popup */}
            {showGiftConfirmation && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-black/30 z-[100]"
                    onClick={() => setShowGiftConfirmation(null)}
                  />
                  
                  {/* Confirmation Card */}
                  <div
                    className="fixed z-[101] w-[340px] bg-white rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.15)] p-6 text-center"
                    style={{
                      left: showGiftConfirmation.position?.x ?? '50%',
                      top: showGiftConfirmation.position?.y ?? '50%',
                    }}
                  >
                    {/* Success Icon */}
                    <div
                      className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    
                    {/* Title */}
                    <h3
                      className="text-xl font-semibold text-gray-900 mb-2"
                    >
                      {locale === 'ar' ? 'تم إرسال الهدية!' : 'Gift Sent!'}
                    </h3>
                    
                    {/* Description */}
                    <p
                      className="text-gray-500 text-sm mb-5"
                    >
                      {locale === 'ar' 
                        ? `تم إرسال ${showGiftConfirmation.product.title} إلى ${showGiftConfirmation.contact.name}`
                        : `${showGiftConfirmation.product.title} has been sent to ${showGiftConfirmation.contact.name}`
                      }
                    </p>
                    
                    {/* Recipient Info */}
                    <div
                      className="flex items-center justify-center gap-3 p-3 bg-gray-50 rounded-xl mb-5"
                    >
                      <Image
                        src={showGiftConfirmation.contact.avatar}
                        alt={showGiftConfirmation.contact.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                      <div className="text-left">
                        <p className="font-medium text-gray-900 text-sm">{showGiftConfirmation.contact.name}</p>
                        <p className="text-xs text-gray-500">{showGiftConfirmation.contact.username}</p>
                      </div>
                    </div>
                    
                    {/* Done Button */}
                    <div
                    >
                      <Button
                        className="w-full h-11 rounded-xl bg-[#F4610B] text-white hover:bg-[#d4540a] transition-colors"
                        onClick={() => setShowGiftConfirmation(null)}
                      >
                        {locale === 'ar' ? 'تم' : 'Done'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
          </section>

          <section className="container mx-auto px-4 py-20 bg-white rounded-4xl mb-16">
            <section id="integrations">
              <div className="max-w-7xl mx-auto">
                <div 
                  className="flex flex-col gap-4 text-center"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Image
                      src={HAADY_LOGO_URL}
                      alt="Haady"
                      width={58}
                      height={64}
                      className="object-contain"
                      unoptimized
                    />
                    <ArrowUpDown 
                      size={26} 
                      className="text-gray-300 rotate-90" 
                      animation="default-loop"
                      loop={true}
                    />
                    <div className="rounded-full bg-orange-100 w-16 h-16 flex items-center justify-center">
                      <Store className="w-[42px] h-[42px] text-[#F4610B]" />
                    </div>
                  </div>
                  <h2 className={`text-3xl ${locale === 'ar' ? 'font-semibold' : 'font-bold'} tracking-tight md:text-4xl`}>{t('landing.integrations.title')}</h2>
                  <p className="text-muted-foreground text-lg md:text-xl">{t('landing.integrations.subtitle')}</p>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
                  {integrations.map((item, index) => (
                    item.logo && (
                      <div 
                        key={item.title} 
                        className="flex items-center justify-center"
                      >
                        <Image
                          src={item.logo}
                          alt={item.title}
                          width={item.title === 'OpenCart' ? 140 : 112}
                          height={item.title === 'OpenCart' ? 140 : 112}
                          className={item.title === 'OpenCart' ? 'h-36 w-36 object-contain grayscale hover:grayscale-0 opacity-30 hover:opacity-100 transition-all duration-300' : 'h-28 w-28 object-contain grayscale hover:grayscale-0 opacity-30 hover:opacity-100 transition-all duration-300'}
                          unoptimized
                        />
                      </div>
                    )
                  ))}
                </div>
                <div 
                  className="mt-8 text-center"
                >
                  <Button asChild size="lg" className="bg-[#F4610B] text-white hover:bg-black border-0 transition-colors duration-0 transition-transform duration-300 hover:-translate-y-1 h-[52px] group">
                    <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning className="flex items-center gap-2">
                      <AnimateIcon animateOnHover className="group-hover:animate-in">
                        <AnimatedLink className="h-4 w-4" />
                      </AnimateIcon>
                      {t('landing.integrations.cta')}
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          </section>

          {/* Value Proposition Section */}
          <section className="container mx-auto px-4 py-12">
            <section>
              <div className="max-w-7xl mx-auto rounded-2xl bg-white/70 px-8 py-10">
                <div
                >
                  <h2 className={`text-center text-3xl ${locale === 'ar' ? 'font-semibold' : 'font-bold'} tracking-tight md:text-4xl mb-4`}>
                    {t('landing.hero.microTrust')}
                  </h2>
                  <p className="text-center text-muted-foreground text-lg md:text-xl mb-12">
                    {locale === 'ar' 
                      ? 'احتفظ بمنصتك الحالية وسير العمل، هادي يتصل بسرعة ويبدأ العمل فوراً.'
                      : 'Keep your current platform and workflows, Haady plugs in and goes live quickly.'}
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                  {heroBullets.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className=""
                      >
                        <Card className="group relative min-h-[200px] overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 flex flex-col transition-all duration-200 hover:-translate-y-1 bg-white">
                          <CardHeader>
                            <div 
                              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                              style={{ backgroundColor: `${item.color}15` }}
                            >
                              <Icon className="h-6 w-6" style={{ color: item.color }} />
                            </div>
                            <CardTitle className="text-lg tracking-tight">{item.title}</CardTitle>
                            <CardDescription className="text-sm">
                              {item.subtitle.charAt(0).toUpperCase() + item.subtitle.slice(1)}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </section>

          {/* Comparison Table Section */}
          <section className="container mx-auto px-4 py-20">
            <section id="comparison">
              <div className="max-w-7xl mx-auto">
                <div 
                  className="flex flex-col gap-4 text-center mb-12"
                >
                  <h2 className={`text-3xl ${locale === 'ar' ? 'font-semibold' : 'font-bold'} tracking-tight md:text-4xl`}>
                    {t('landing.problem.title')}
                  </h2>
                  <p className="text-muted-foreground text-lg md:text-xl">
                    {t('landing.problem.subtitle')}
                  </p>
                </div>

                {/* Comparison Table */}
                <div
                  className="bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] overflow-hidden border border-gray-200/60"
                >
                  {/* Table Header */}
                  <div className="grid grid-cols-3">
                    <div className="p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100/80 border-b-2 border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200/80 shrink-0">
                          <AlertCircle className="h-5 w-5 text-gray-600" />
                        </div>
                        <span className="font-bold text-gray-900 text-lg">
                          {locale === 'ar' ? 'التحدي' : 'Challenge'}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 lg:p-8 bg-gradient-to-br from-[#00A86B]/10 to-[#00A86B]/5 border-b-2 border-[#00A86B]/30 relative">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iIzAwQTg2QiIgZmlsbC1vcGFjaXR5PSIwLjAzIiBjeD0iMjAiIGN5PSIyMCIgcj0iMiIvPjwvZz48L3N2Zz4=')] opacity-50"></div>
                      <div className="flex items-center gap-3 relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm shrink-0 ring-1 ring-[#00A86B]/20">
                          <Image
                            src={HAADY_LOGO_URL}
                            alt="Haady"
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <span className="font-bold text-[#00A86B] text-xl tracking-tight">Haady</span>
                      </div>
                    </div>
                    <div className="p-6 lg:p-8 bg-gradient-to-br from-red-50/80 to-orange-50/50 border-b-2 border-red-200/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100/80 shrink-0">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                        <span className="font-bold text-gray-700 text-lg">
                          {locale === 'ar' ? 'المنصات الأخرى' : 'Other Platforms'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Rows - Based on Problems */}
                  <div className="comparison-rows">
                    {[
                      {
                        problem: t('landing.problem.points.address'),
                        haady: locale === 'ar' ? 'المشتري يشتري بدون عنوان - المستلم يؤكد لاحقاً' : 'Buyer purchases without address - recipient confirms later',
                        other: locale === 'ar' ? 'يتطلب عنوان المستلم عند الدفع' : 'Requires recipient address at checkout'
                      },
                      {
                        problem: t('landing.problem.points.timing'),
                        haady: locale === 'ar' ? 'المستلم يختار وقت التوصيل المناسب' : 'Recipient chooses their preferred delivery time',
                        other: locale === 'ar' ? 'توقيت التوصيل غير واضح أو عشوائي' : 'Delivery timing unclear or random'
                      },
                      {
                        problem: t('landing.problem.points.carts'),
                        haady: locale === 'ar' ? 'سداد سريع في ثوانٍ - لا تأخير' : 'Lightning-fast checkout in seconds',
                        other: locale === 'ar' ? 'عربات التسوق تُهجر بسبب التعقيد' : 'Carts get abandoned due to complexity'
                      },
                      {
                        problem: t('landing.problem.points.manual'),
                        haady: locale === 'ar' ? 'تأكيد تلقائي للتفاصيل عبر هادي' : 'Automatic details confirmation',
                        other: locale === 'ar' ? 'تنسيق يدوي عبر الهاتف/البريد' : 'Manual coordination via phone/email'
                      },
                      {
                        problem: t('landing.problem.points.failed'),
                        haady: locale === 'ar' ? 'تفاصيل مؤكدة = توصيل ناجح' : 'Confirmed details = successful deliveries',
                        other: locale === 'ar' ? 'معدل فشل توصيل أعلى' : 'Higher delivery failure rate'
                      }
                    ].map((row, index) => {
                      const isOtherHovered = hoveredRowIndex !== null && hoveredRowIndex !== index;
                      const opacity = isOtherHovered ? 0.4 : 1;
                      
                      return (
                      <div 
                        key={index}
                        className="grid grid-cols-3 hover:bg-gray-50/50 transition-all duration-200 comparison-row"
                        style={{ opacity: hoveredRowIndex !== null ? opacity : 1 }}
                        onMouseEnter={() => setHoveredRowIndex(index)}
                        onMouseLeave={() => setHoveredRowIndex(null)}
                      >
                      <div className="p-5 lg:p-6 border-b border-r border-gray-100 flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100/80 shrink-0">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <span className="font-medium text-gray-700 text-sm lg:text-base">{row.problem}</span>
                      </div>
                      <div className="p-5 lg:p-6 bg-[#00A86B]/[0.04] border-b border-[#00A86B]/10 flex items-center gap-3 group-hover:bg-[#00A86B]/[0.08] transition-colors duration-200">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00A86B] shrink-0 shadow-sm">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-gray-900 font-medium text-sm lg:text-base">{row.haady}</span>
                      </div>
                      <div className="p-5 lg:p-6 border-b border-gray-100 flex items-center gap-3 bg-red-50/30 group-hover:bg-red-50/50 transition-colors duration-200">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 shrink-0">
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </div>
                        <span className="text-gray-500 text-sm lg:text-base">{row.other}</span>
                      </div>
                    </div>
                    );
                    })}
                  </div>
                  
                  {/* Bottom CTA */}
                  <div className="bg-gradient-to-r from-[#F4610B]/10 via-[#F4610B]/5 to-orange-50/80 p-8 lg:p-10">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                      <div className="flex flex-col gap-2 text-center lg:text-left">
                        <p className="text-gray-900 font-bold text-lg lg:text-xl">
                          {locale === 'ar' ? 'جاهز لتحويل تجربة الإهداء؟' : 'Ready to transform gifting?'}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {locale === 'ar' ? 'انضم إلى مئات المتاجر التي تستخدم هادي' : 'Join hundreds of stores using Haady'}
                        </p>
                      </div>
                      <Button asChild size="lg" className="bg-[#F4610B] text-white hover:bg-[#d4550a] border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#F4610B]/25 h-[56px] rounded-2xl px-8 font-semibold text-base">
                        <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning className="flex items-center gap-2">
                          {locale === 'ar' ? 'ابدأ مجاناً' : 'Start for free'}
                          <ArrowRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>

          <div className="container mx-auto px-4 py-20">
            <section id="features">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col gap-4 text-center mb-16">
                  <h2 className={`text-3xl ${locale === 'ar' ? 'font-black' : 'font-bold'} tracking-tight md:text-4xl`}>{t('landing.features.title')}</h2>
                  <p className="text-muted-foreground md:text-lg">{t('landing.features.subtitle')}</p>
                </div>
                
                {/* Feature Sections with alternating layout */}
                <div className="space-y-32 lg:space-y-40">
                  {featureCards.map((item, index) => {
                    const isEven = index % 2 === 0;
                    const isRTLReverse = isRTL ? !isEven : isEven;
                    
                    return (
                      <div
                        key={item.title}
                        className={`flex flex-col lg:flex-row items-center gap-12 ${
                          isRTLReverse ? 'lg:flex-row-reverse' : ''
                        }`}
                      >
                        {/* Content Section */}
                        <div 
                          className={`flex-1 text-center ${isRTL ? 'lg:text-right' : 'lg:text-left'}`}
                        >
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F4610B]/10 mb-4">
                            <item.icon className="h-5 w-5 text-[#F4610B]" />
                            <span className="text-sm font-medium text-[#F4610B]">
                              {item.subtitle}
                            </span>
                          </div>
                          
                          <h3 className={`text-3xl ${locale === 'ar' ? 'font-black' : 'font-bold'} tracking-tight mb-4 text-gray-900`}>
                            {item.title}
                          </h3>
                          
                          <p className={`text-lg text-muted-foreground mb-6 max-w-xl mx-auto ${isRTL ? 'lg:mr-0' : 'lg:ml-0'}`}>
                            {item.description}
                          </p>
                          
                          {/* Feature bullets */}
                          <div className="space-y-3">
                            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <CheckCircle2 className="h-5 w-5 text-[#F4610B] mt-0.5 flex-shrink-0" />
                              <p className="text-gray-700">{item.subtitle}</p>
                            </div>
                            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <CheckCircle2 className="h-5 w-5 text-[#F4610B] mt-0.5 flex-shrink-0" />
                              <p className="text-gray-700">{item.description}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Image Section */}
                        <div 
                          className="flex-1 w-full lg:w-auto"
                        >
                          <div className="relative w-full h-[300px] lg:h-[400px] rounded-3xl overflow-hidden flex items-center justify-center p-6">
                            {/* Feature-specific visual mockups */}
                            <div className="relative">
                            {index === 0 && (
                              /* Username/Gift Link Feature */
                              <div className="w-full max-w-[420px]">
                                <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                                  <div 
                                    className="flex items-center gap-4"
                                  >
                                    <div
                                    >
                                      <Image
                                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                                        alt="Sarah Ahmed"
                                        width={56}
                                        height={56}
                                        className="w-14 h-14 rounded-full object-cover"
                                        unoptimized
                                      />
                                    </div>
                                    <div
                                    >
                                      <p className="font-semibold text-gray-900 text-base">haady.gift/@sarah_ahmed</p>
                                      <p className="text-sm text-gray-500">{locale === 'ar' ? 'رابط هدايا سارة' : "Sarah's gift link"}</p>
                                    </div>
                                  </div>
                                  <div 
                                    className="flex gap-3"
                                  >
                                    <div 
                                      className="flex-1 bg-gray-50 rounded-xl p-3 text-sm text-gray-600 truncate"
                                    >
                                      haady.gift/@sarah_ahmed
                                    </div>
                                    <button 
                                      className="px-5 py-3 bg-[#F4610B] text-white rounded-xl text-sm font-medium"
                                    >
                                      {locale === 'ar' ? 'نسخ' : 'Copy'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {index === 1 && (
                              /* Catalog Feature */
                              <div className="w-full max-w-[360px]">
                                <div className="grid grid-cols-2 gap-3">
                                  {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-white rounded-xl shadow-lg p-3">
                                      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-2 flex items-center justify-center">
                                        <Package className="w-8 h-8 text-gray-300" />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="h-3 bg-gray-200 rounded w-full" />
                                        <div className="h-3 bg-[#F4610B]/20 rounded w-1/2" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 bg-white rounded-xl shadow-lg p-3 flex items-center justify-between">
                                  <span className="text-sm text-gray-600">{locale === 'ar' ? 'المنتجات الجاهزة للإهداء' : 'Gift-ready products'}</span>
                                  <span className="text-lg font-bold text-[#F4610B]">128</span>
                                </div>
                              </div>
                            )}
                            
                            {index === 2 && (
                              /* Presentation Feature */
                              <div className="w-full max-w-[300px] space-y-4">
                                <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
                                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#F4610B] to-orange-400 rounded-2xl flex items-center justify-center">
                                    <Gift className="w-10 h-10 text-white" />
                                  </div>
                                  <p className="text-lg font-semibold text-gray-900 mb-1">{locale === 'ar' ? 'هدية لك!' : 'A gift for you!'}</p>
                                  <p className="text-sm text-gray-500">{locale === 'ar' ? 'من @sarah_ahmed' : 'From @sarah_ahmed'}</p>
                                </div>
                                <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
                                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-[#F4610B]" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{locale === 'ar' ? 'رسالة شخصية' : 'Personal message'}</p>
                                    <p className="text-xs text-gray-500">{locale === 'ar' ? 'مبارك على تخرجك!' : 'Congratulations on your graduation!'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {index === 3 && (
                              /* Management Feature */
                              <div className="w-full max-w-[340px] space-y-3">
                                <div className="bg-white rounded-2xl shadow-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-gray-900">{locale === 'ar' ? 'الطلبات الجديدة' : 'New Orders'}</span>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">12</span>
                                  </div>
                                  {[1, 2].map((i) => (
                                    <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0 border-gray-100">
                                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Package className="w-5 h-5 text-gray-400" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">#ORD-{1234 + i}</p>
                                        <p className="text-xs text-gray-500">{locale === 'ar' ? 'في انتظار التأكيد' : 'Pending confirmation'}</p>
                                      </div>
                                      <div className="w-2 h-2 bg-[#F4610B] rounded-full" />
                                    </div>
                                  ))}
                                </div>
                                <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-sm text-gray-700">{locale === 'ar' ? 'معدل الإكمال' : 'Completion rate'}</span>
                                  </div>
                                  <span className="text-lg font-bold text-green-600">94%</span>
                                </div>
                              </div>
                            )}
                            
                            {index === 4 && (
                              /* Campaigns Feature */
                              <div className="w-full max-w-[340px] space-y-3">
                                <div className="bg-white rounded-2xl shadow-lg p-4">
                                  <p className="text-sm font-semibold text-gray-900 mb-3">{locale === 'ar' ? 'المواسم النشطة' : 'Active Seasons'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      { name: locale === 'ar' ? 'رمضان' : 'Ramadan', color: 'bg-green-100 text-green-700' },
                                      { name: locale === 'ar' ? 'العيد' : 'Eid', color: 'bg-purple-100 text-purple-700' },
                                      { name: locale === 'ar' ? 'زفاف' : 'Wedding', color: 'bg-pink-100 text-pink-700' },
                                      { name: locale === 'ar' ? 'تخرج' : 'Graduation', color: 'bg-blue-100 text-blue-700' },
                                    ].map((season) => (
                                      <span key={season.name} className={`px-3 py-1.5 ${season.color} text-xs font-medium rounded-full`}>
                                        {season.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-700">{locale === 'ar' ? 'مبيعات رمضان' : 'Ramadan Sales'}</span>
                                    <span className="text-xs text-green-600 font-medium">+127%</span>
                                  </div>
                                  <div className="flex items-end gap-1 h-12">
                                    {[40, 55, 35, 70, 85, 95, 80].map((h, i) => (
                                      <div key={i} className="flex-1 bg-gradient-to-t from-[#F4610B] to-orange-300 rounded-t" style={{ height: `${h}%` }} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {index === 5 && (
                              /* Insights Feature */
                              <div className="w-full max-w-[340px] space-y-3">
                                <div className="bg-white rounded-2xl shadow-lg p-4">
                                  <p className="text-sm font-semibold text-gray-900 mb-3">{locale === 'ar' ? 'أفضل المنتجات' : 'Top Products'}</p>
                                  {[
                                    { name: locale === 'ar' ? 'صندوق الشوكولاتة' : 'Chocolate Box', pct: 85 },
                                    { name: locale === 'ar' ? 'باقة الورد' : 'Rose Bouquet', pct: 72 },
                                    { name: locale === 'ar' ? 'بطاقة هدية' : 'Gift Card', pct: 65 },
                                  ].map((product) => (
                                    <div key={product.name} className="mb-2 last:mb-0">
                                      <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-700">{product.name}</span>
                                        <span className="text-gray-500">{product.pct}%</span>
                                      </div>
                                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-[#F4610B] to-orange-400 rounded-full" style={{ width: `${product.pct}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-white rounded-xl shadow-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-[#F4610B]">4.8</p>
                                    <p className="text-xs text-gray-500">{locale === 'ar' ? 'متوسط التقييم' : 'Avg Rating'}</p>
                                  </div>
                                  <div className="bg-white rounded-xl shadow-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600">89%</p>
                                    <p className="text-xs text-gray-500">{locale === 'ar' ? 'عملاء راضون' : 'Happy Customers'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
                  {outcomes.map((item) => (
                    <span key={item} className="rounded-full border border-black/10 bg-white/70 px-4 py-1">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="container mx-auto px-4 py-20">
            <section id="how-it-works">
              <div className="max-w-7xl mx-auto">
                <div 
                  className="flex flex-col gap-4"
                >
                  <h2 className={`text-3xl ${locale === 'ar' ? 'font-black' : 'font-bold'} tracking-tight md:text-4xl`}>{t('landing.howItWorks.title')}</h2>
                  <p className="text-muted-foreground md:text-lg">{t('landing.howItWorks.subtitle')}</p>
                </div>
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                  {steps.map((step, index) => (
                    <div
                      key={step.title}
                    >
                      <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 bg-white h-full transition-all duration-200 hover:-translate-y-1">
                        <CardHeader className="space-y-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0EA5E9]/10 text-sm font-semibold text-[#0B4A6F]">
                            {index + 1}
                          </div>
                          <CardTitle className="text-lg tracking-tight">{step.title}</CardTitle>
                          <CardDescription>{step.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  ))}
                </div>
                <div 
                  className="mt-8"
                >
                  <Button asChild size="lg">
                    <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>
                      {t('landing.howItWorks.cta')}
                      <ArrowRight className={isRTL ? 'mr-2 rotate-180' : 'ml-2'} />
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          </section>


          <section className="container mx-auto px-4 py-20">
            <section>
              <div className="max-w-5xl mx-auto">
                <div
                >
                  <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 bg-white transition-all duration-200 hover:-translate-y-1">
                    <CardHeader className="text-center space-y-4">
                      <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">
                        {t('landing.conversion.title')}
                      </CardTitle>
                      <CardDescription className="text-lg">
                        {t('landing.conversion.subtitle')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-4 pt-6 sm:flex-row">
                      <Button asChild size="lg" className="text-base">
                        <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>
                          {t('landing.conversion.cta.primary')}
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="text-base">
                        <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>
                          {t('landing.conversion.cta.secondary')}
                        </Link>
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {t('landing.conversion.micro')}
                      </span>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          </section>

          <section className="container mx-auto px-4 py-20">
            <section id="faq">
              <div className="max-w-7xl mx-auto">
                <div 
                  className="flex flex-col gap-4"
                >
                  <h2 className={`text-3xl ${locale === 'ar' ? 'font-black' : 'font-bold'} tracking-tight md:text-4xl`}>{t('landing.faq.title')}</h2>
                  <p className="text-muted-foreground md:text-lg">{t('landing.faq.subtitle')}</p>
                </div>
                <div className="mt-10 grid gap-6 md:grid-cols-2">
                  {faqItems.map((item, index) => (
                    <div
                      key={item.question}
                    >
                      <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 bg-white h-full transition-all duration-200 hover:-translate-y-1">
                        <CardHeader>
                          <CardTitle className="text-base tracking-tight">{item.question}</CardTitle>
                          <CardDescription>{item.answer}</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </section>
        </main>
      </div>

      <footer className="border-t border-black/5">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <p className="text-muted-foreground text-sm">
              {t('landing.footer.copyright')}
            </p>
            <div className={`flex flex-wrap gap-6 text-sm ${isRTL ? 'justify-end' : 'justify-start'}`}>
              <Link href={`${homeUrl}#integrations`} className="text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('landing.footer.links.integrations')}
              </Link>
              <Link href={localizedUrl('/changelog')} className="text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('landing.footer.links.changelog')}
              </Link>
              <Link href={localizedUrl('/status')} className="text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('landing.footer.links.status')}
              </Link>
              <Link href={localizedUrl('/terms')} className="text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('landing.footer.links.terms')}
              </Link>
              <Link href={localizedUrl('/privacy')} className="text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('landing.footer.links.privacy')}
              </Link>
              <Link href={localizedUrl('/support')} className="text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('landing.footer.links.support')}
              </Link>
              <Link href={localizedUrl('/contact')} className="text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('landing.footer.links.contact')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
