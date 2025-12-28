'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Loader2, ChevronDown, Upload, X, Plus, Minus, Camera, Store, Link as LinkIcon, Search, Clock, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/toast'
import { useLoading } from '@/lib/loading-context'
import { Flag } from '@/components/flag'
import { useLocale } from '@/i18n/context'
import { parseLocaleCountry, getLocaleCountryFromCookies } from '@/lib/localized-url'
import { useAuth } from '@/lib/auth/auth-context'
import { FormStateCookies, NavigationCookies, UXCookies, UserPreferencesCookies } from '@/lib/cookies'
import { OnboardingStepProps } from '../OnboardingWizard'

interface Country {
  id: string
  name: string
  name_ar?: string
  iso2: string
  iso3?: string
  phone_code?: string
  flag_url?: string
}

interface BusinessType {
  id?: string
  name: string
  value?: string
  icon?: string
  name_ar?: string
}

interface StoreCategory {
  id: string
  name: string
  name_ar?: string
  slug?: string
  icon?: string
}

interface City {
  id: string
  name: string
  name_ar?: string
  country_id: string
}

// Error messages translations
const errorMessages = {
  en: {
    fullName: {
      min: 'Full name must be at least 2 characters',
      max: 'Full name must be at most 100 characters',
      regex: 'Full name can only contain letters, spaces, hyphens, and apostrophes',
      fullName: 'Please enter your full name (first and last name)',
      spaces: 'Full name cannot start or end with spaces',
    },
    businessName: {
      min: 'Business name must be at least 2 characters',
      max: 'Business name must be at most 100 characters',
      regex: 'Business name can only contain letters, numbers, spaces, and common punctuation',
      spaces: 'Business name cannot start or end with spaces',
      consecutiveSpaces: 'Business name cannot contain multiple consecutive spaces',
    },
    country: {
      required: 'Please select a country',
    },
    businessType: {
      required: 'Please select a business type',
    },
    mobilePhone: {
      min: 'Mobile phone must be at least 8 characters',
      max: 'Mobile phone must be at most 20 characters',
      regex: 'Please enter a valid phone number',
    },
    storeName: {
      min: 'English store name must be at least 2 characters',
      max: 'English store name must be at most 100 characters',
      required: 'English store name is required',
    },
    storeNameAr: {
      min: 'Arabic store name must be at least 2 characters',
      max: 'Arabic store name must be at most 100 characters',
      required: 'Arabic store name is required',
    },
    storeCategory: {
      required: 'Please select at least one store category',
      min: 'Please select at least one store category',
      max: 'You can select up to 3 categories maximum',
    },
    storeCountry: {
      required: 'Please select a country',
    },
    storeCity: {
      required: 'City is required',
    },
    storeType: {
      required: 'Please select a store type',
    },
    storeAddress: {
      max: 'Address must be at most 200 characters',
    },
  },
  ar: {
    fullName: {
      min: 'يجب أن يكون الاسم الكامل على الأقل حرفين',
      max: 'يجب ألا يتجاوز الاسم الكامل 100 حرف',
      regex: 'يمكن أن يحتوي الاسم الكامل فقط على الأحرف والمسافات والشرطات والفواصل العليا',
      fullName: 'الرجاء إدخال اسمك الكامل (الاسم الأول والأخير)',
      spaces: 'لا يمكن أن يبدأ الاسم الكامل أو ينتهي بمسافات',
    },
    businessName: {
      min: 'يجب أن يكون اسم العمل على الأقل حرفين',
      max: 'يجب ألا يتجاوز اسم العمل 100 حرف',
      regex: 'يمكن أن يحتوي اسم العمل فقط على الأحرف والأرقام والمسافات وعلامات الترقيم الشائعة',
      spaces: 'لا يمكن أن يبدأ اسم العمل أو ينتهي بمسافات',
      consecutiveSpaces: 'لا يمكن أن يحتوي اسم العمل على مسافات متتالية متعددة',
    },
    country: {
      required: 'الرجاء اختيار بلد',
    },
    businessType: {
      required: 'الرجاء اختيار نوع العمل',
    },
    mobilePhone: {
      min: 'يجب أن يكون رقم الجوال على الأقل 8 أحرف',
      max: 'يجب ألا يتجاوز رقم الجوال 20 حرف',
      regex: 'الرجاء إدخال رقم هاتف صحيح',
    },
    storeName: {
      min: 'يجب أن يكون اسم المتجر بالإنجليزية على الأقل حرفين',
      max: 'يجب ألا يتجاوز اسم المتجر بالإنجليزية 100 حرف',
      required: 'اسم المتجر بالإنجليزية مطلوب',
    },
    storeNameAr: {
      min: 'يجب أن يكون اسم المتجر بالعربية على الأقل حرفين',
      max: 'يجب ألا يتجاوز اسم المتجر بالعربية 100 حرف',
      required: 'اسم المتجر بالعربية مطلوب',
    },
    storeCategory: {
      required: 'الرجاء اختيار فئة واحدة على الأقل',
      min: 'الرجاء اختيار فئة واحدة على الأقل',
      max: 'يمكنك اختيار 3 فئات كحد أقصى',
    },
    storeCountry: {
      required: 'الرجاء اختيار بلد',
    },
    storeCity: {
      required: 'المدينة مطلوبة',
    },
    storeType: {
      required: 'الرجاء اختيار نوع المتجر',
    },
    storeAddress: {
      max: 'يجب ألا يتجاوز العنوان 200 حرف',
    },
  },
}

// Create schema with locale-aware error messages
const createSetupSchema = (locale: 'en' | 'ar' = 'en') => {
  const errors = errorMessages[locale]
  
  return z.object({
    storeName: z
      .string()
      .min(1, errors.storeName.required)
      .min(2, errors.storeName.min)
      .max(100, errors.storeName.max),
    storeNameAr: z
      .string()
      .min(1, errors.storeNameAr.required)
      .min(2, errors.storeNameAr.min)
      .max(100, errors.storeNameAr.max),
    storeCategory: z
      .array(z.string())
      .min(1, errors.storeCategory.min)
      .max(3, errors.storeCategory.max),
    storeCountry: z
      .string()
      .min(1, errors.storeCountry.required),
    storeCity: z
      .string()
      .min(1, errors.storeCity.required)
      .min(2, 'City must be at least 2 characters'),
    storeType: z
      .array(z.enum(['online', 'retail', 'hybrid', 'pop_up']))
      .min(1, errors.storeType.required)
      .max(4, 'You can select up to 4 store types maximum'),
    storeAddress: z
      .string()
      .max(200, errors.storeAddress.max)
      .optional(),
    openingHours: z.record(z.string(), z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    })).optional(),
  })
}

type SetupFormData = z.infer<ReturnType<typeof createSetupSchema>>

// Translations
const translations = {
  en: {
    fullName: 'Full Name',
    fullNamePlaceholder: 'Your full name',
    country: 'Country',
    selectCountry: 'Select your country',
    mobilePhone: 'Mobile Phone',
    businessName: 'Business Name',
    businessNamePlaceholder: 'Your Company Name',
    businessType: 'Business Type',
    selectBusinessType: 'Select business type',
    storeName: 'Store Name',
    storeNamePlaceholder: 'Your Store Name',
    storeCategory: 'Store Categories',
    selectStoreCategory: 'Select categories',
    storeCountry: 'Country',
    selectStoreCountry: 'Select country',
    storeCity: 'City',
    storeCityPlaceholder: 'Enter city name',
    storeType: 'Store Type',
    selectStoreType: 'Select store type',
    storeAddress: 'Address',
    storeAddressPlaceholder: 'Store address',
    storeLogo: 'Store Logo',
    uploadLogo: 'Drop your logo here, or click to upload',
    logoFormat: 'PNG only • Square (1:1) • Max 2 MB',
    continue: 'Continue',
    creating: 'Creating your business...',
  },
  ar: {
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'اسمك الكامل',
    country: 'البلد',
    selectCountry: 'اختر بلدك',
    mobilePhone: 'رقم الجوال',
    businessName: 'اسم العمل',
    businessNamePlaceholder: 'اسم شركتك',
    businessType: 'نوع العمل',
    selectBusinessType: 'اختر نوع العمل',
    storeName: 'اسم المتجر',
    storeNamePlaceholder: 'اسم متجرك',
    storeAddress: 'العنوان',
    storeAddressPlaceholder: 'عنوان المتجر',
    storeCategory: 'فئات المتجر',
    selectStoreCategory: 'اختر الفئات',
    storeCountry: 'البلد',
    selectStoreCountry: 'اختر البلد',
    storeCity: 'المدينة',
    storeCityPlaceholder: 'أدخل اسم المدينة',
    storeType: 'نوع المتجر',
    selectStoreType: 'اختر نوع المتجر',
    storeLogo: 'شعار المتجر',
    uploadLogo: 'أسقط شعارك هنا، أو انقر للرفع',
    logoFormat: 'PNG فقط • مربع (1:1) • الحد الأقصى 2 ميجابايت',
    continue: 'متابعة',
    creating: 'جاري إنشاء عملك...',
  },
}

export function BusinessSetupStep({ onNext }: OnboardingStepProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { setLoading } = useLoading()
  const { locale, isRTL } = useLocale()
  const { user } = useAuth()
  const t = translations[locale] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([])
  const [isLoadingBusinessTypes, setIsLoadingBusinessTypes] = useState(true)
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([])
  const [isLoadingStoreCategories, setIsLoadingStoreCategories] = useState(true)
  const [categorySearch, setCategorySearch] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [isOpeningHoursOpen, setIsOpeningHoursOpen] = useState(false)
  const [isStoreCategoryOpen, setIsStoreCategoryOpen] = useState(false)
  const [isStoreTypeOpen, setIsStoreTypeOpen] = useState(false)
  const [isStoreCountryOpen, setIsStoreCountryOpen] = useState(false)
  const [isStoreCityOpen, setIsStoreCityOpen] = useState(false)
  const [focusedTimeInput, setFocusedTimeInput] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isStoreNameArabic, setIsStoreNameArabic] = useState(locale === 'ar')
  const [isLogoHovered, setIsLogoHovered] = useState(false)
  const storeNameInputRef = useRef<HTMLInputElement>(null)
  const storeNameArInputRef = useRef<HTMLInputElement>(null)

  // Create locale-aware schema
  const setupSchema = useMemo(() => createSetupSchema(locale), [locale])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting: formIsSubmitting },
    setValue,
    watch,
    trigger,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: {
      storeName: '',
      storeNameAr: '',
      storeCategory: [],
      storeCountry: '',
      storeCity: '',
      storeType: ['online'],
      storeAddress: '',
      openingHours: {},
    },
  })

  const setValueRef = useRef(setValue)
  useEffect(() => {
    setValueRef.current = setValue
  }, [setValue])

  const storeCategory = watch('storeCategory')
  const selectedStoreCategories = storeCategories.filter(cat => storeCategory?.includes(cat.id))
  const storeName = watch('storeName')
  const storeNameAr = watch('storeNameAr')
  const storeCountry = watch('storeCountry')
  const selectedStoreCountry = countries.find(c => c.id === storeCountry)
  const storeCity = watch('storeCity')
  const selectedCity = cities.find(city => city.id === storeCity)
  const storeType = watch('storeType')
  
  // Store type options
  const storeTypeOptions = useMemo(() => [
    { value: 'online', label: locale === 'ar' ? 'أونلاين' : 'Online', labelAr: 'أونلاين' },
    { value: 'retail', label: locale === 'ar' ? 'بيع بالتجزئة' : 'Retail', labelAr: 'بيع بالتجزئة' },
    { value: 'hybrid', label: locale === 'ar' ? 'هجين' : 'Hybrid', labelAr: 'هجين' },
    { value: 'pop_up', label: locale === 'ar' ? 'منبثق' : 'Pop-up', labelAr: 'منبثق' },
  ], [locale])
  
  const selectedStoreTypes = useMemo(() => 
    storeTypeOptions.filter(option => storeType?.includes(option.value as 'online' | 'retail' | 'hybrid' | 'pop_up')),
    [storeTypeOptions, storeType]
  )
  
  // Check if any selected store type is physical (retail, hybrid, or pop_up)
  const hasPhysicalStoreType = useMemo(() => {
    if (!storeType || storeType.length === 0) return false
    return storeType.some(type => type !== 'online')
  }, [storeType])

  // Check if retail is selected (for showing address field)
  const hasRetailStoreType = useMemo(() => {
    if (!storeType || storeType.length === 0) return false
    return storeType.includes('retail')
  }, [storeType])
  
  const openingHours = watch('openingHours')
  
  // Initialize opening hours with default values when physical store type is selected
  useEffect(() => {
    if (hasPhysicalStoreType && (!openingHours || Object.keys(openingHours).length === 0)) {
      const defaultHours: Record<string, { open: string; close: string; closed: boolean }> = {}
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      days.forEach(day => {
        defaultHours[day] = { open: '09:00', close: '00:00', closed: false }
      })
      setValue('openingHours', defaultHours, { shouldValidate: false })
    }
  }, [hasPhysicalStoreType, openingHours, setValue])
  
  const handleOpeningHoursChange = (day: string, field: string, value: string | boolean) => {
    const currentHours = openingHours || {}
    const dayHours = currentHours[day] || { open: '09:00', close: '00:00', closed: false }
    setValue('openingHours', {
      ...currentHours,
      [day]: { ...dayHours, [field]: value }
    }, { shouldValidate: false })
  }

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return storeCategories
    
    const searchLower = categorySearch.toLowerCase().trim()
    return storeCategories.filter(cat => {
      const nameMatch = cat.name?.toLowerCase().includes(searchLower)
      const nameArMatch = cat.name_ar?.toLowerCase().includes(searchLower)
      const slugMatch = cat.slug?.toLowerCase().includes(searchLower)
      return nameMatch || nameArMatch || slugMatch
    })
  }, [storeCategories, categorySearch])

  // Fetch cities when country changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!storeCountry) {
        setCities([])
        setValue('storeCity', '', { shouldValidate: false })
        return
      }

      setIsLoadingCities(true)
      try {
        // Try cities_master first (as per schema)
        let { data, error } = await supabase
          .from('cities_master')
          .select('id, name, name_ar, country_id')
          .eq('country_id', storeCountry)
          .order('name', { ascending: true })

        // If cities_master doesn't exist or has error, try cities table
        if (error) {
          console.log('cities_master table not found, trying cities table')
          const { data: citiesData, error: citiesError } = await supabase
            .from('cities')
            .select('id, name, name_ar, country_id')
            .eq('country_id', storeCountry)
            .order('name', { ascending: true })

          if (citiesError) {
            console.error('Error fetching cities:', citiesError)
            toast.error('Error', {
              description: 'Failed to load cities. Please try again.',
              duration: 5000,
            })
            setCities([])
            return
          }
          data = citiesData
          error = null
        }

        if (error) {
          console.error('Error fetching cities:', error)
          toast.error('Error', {
            description: 'Failed to load cities. Please try again.',
            duration: 5000,
          })
          setCities([])
        } else {
          setCities(data || [])
        }
      } catch (error: any) {
        console.error('Error fetching cities:', error)
        toast.error('Error', {
          description: 'Failed to load cities. Please try again.',
          duration: 5000,
        })
        setCities([])
      } finally {
        setIsLoadingCities(false)
      }
    }

    fetchCities()
  }, [storeCountry, setValue])

  // Set default toggle state based on locale
  useEffect(() => {
    setIsStoreNameArabic(locale === 'ar')
  }, [locale])

  // Auto-focus the first input field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isStoreNameArabic) {
        storeNameArInputRef.current?.focus()
      } else {
        storeNameInputRef.current?.focus()
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [isStoreNameArabic])


  // Fetch countries
  useEffect(() => {
    const getUserSelectedCountry = async (): Promise<string | null> => {
      const urlCountry = parseLocaleCountry(pathname)
      if (urlCountry?.country) {
        return urlCountry.country
      }

      const cookieCountry = getLocaleCountryFromCookies()
      if (cookieCountry?.country) {
        return cookieCountry.country
      }

      const userId = user?.id
      if (userId) {
        try {
          const { data, error } = await supabase
            .from('business_profile')
            .select('business_country')
            .eq('auth_user_id', userId)
            .maybeSingle()

          if (!error && data?.business_country) {
            // Get ISO2 code from country ID
            const { data: countryData, error: countryError } = await supabase
              .from('countries')
              .select('iso2')
              .eq('id', data.business_country)
              .single()
            
            if (!countryError && countryData?.iso2) {
              return countryData.iso2
            }
          }
        } catch (error) {
          console.error('Error loading user country preference:', error)
        }
      }

      return null
    }

    const fetchCountries = async () => {
      try {
        // Check if we're in the browser
        if (typeof window === 'undefined') return
        
        const response = await fetch('/api/countries', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch countries: ${response.statusText}`)
        }
        
        const responseData = await response.json()
        const countriesData = responseData.countries || []
        
        if (!countriesData || countriesData.length === 0) {
          toast.error('Error', {
            description: 'No countries found. Please contact support.',
            duration: 5000,
          })
          setCountries([])
          return
        }
        
        const validCountries = countriesData.filter((c: any) => {
          const hasId = c && c.id != null && String(c.id).trim() !== ''
          const hasName = c && c.name != null && String(c.name).trim() !== ''
          const hasIso2 = c && c.iso2 != null && String(c.iso2).trim() !== ''
          return hasId && hasName && hasIso2
        })
        
        if (validCountries.length > 0) {
          setCountries(validCountries)
          
          if (validCountries && validCountries.length > 0) {
            // First, check if there's a saved country from PersonalDetailsStep
            const savedPersonalDetails = FormStateCookies.getLastFormData('personal_details')
            let countryToSet: Country | undefined
            
            if (savedPersonalDetails?.countryId) {
              // Use the country selected in PersonalDetailsStep
              countryToSet = validCountries.find((c: Country) => c.id === savedPersonalDetails.countryId)
            }
            
            if (!countryToSet) {
              // Fallback to URL/cookie country preference
              const userCountryCode = await getUserSelectedCountry()
              const defaultCountry = userCountryCode
                ? validCountries.find((c: Country) => c.iso2 === userCountryCode.toUpperCase())
                : null
              
              countryToSet = defaultCountry || 
                            validCountries.find((c: Country) => c.iso2 === 'SA') || 
                            validCountries[0]
            }
            
            if (countryToSet) {
              // Set the store country to match the personal details country
              setValueRef.current('storeCountry', countryToSet.id, { shouldValidate: false })
            }
          }
        } else {
          setCountries([])
        }
      } catch (error: any) {
        // Silently handle network errors - don't spam console
        const isNetworkError = error.name === 'TypeError' && error.message === 'Failed to fetch'
        const isAbortError = error.name === 'AbortError'
        
        // Only log non-network errors
        if (!isNetworkError && !isAbortError) {
          console.error('Error fetching countries:', error)
        }
        
        // Only show toast for non-abort errors
        if (!isAbortError) {
          if (isNetworkError) {
            toast.error('Network Error', {
              description: 'Unable to connect to the server. Please check your internet connection and try again.',
              duration: 5000,
            })
          } else {
            toast.error('Error', {
              description: error.message || 'Failed to load countries. Please refresh the page.',
              duration: 5000,
            })
          }
        }
        setCountries([])
      } finally {
        setIsLoadingCountries(false)
      }
    }

    fetchCountries()
  }, [pathname, user?.id])

  // Set store country from PersonalDetailsStep when countries are loaded
  useEffect(() => {
    // Only set if countries are loaded and storeCountry is not yet set
    if (countries.length === 0 || storeCountry) {
      return
    }

    // Check if there's a saved country from PersonalDetailsStep
    const savedPersonalDetails = FormStateCookies.getLastFormData('personal_details')
    if (savedPersonalDetails?.countryId) {
      const countryToSet = countries.find((c: Country) => c.id === savedPersonalDetails.countryId)
      if (countryToSet) {
        // Set the store country to match the personal details country
        setValue('storeCountry', countryToSet.id, { shouldValidate: false })
      }
    }
  }, [countries, storeCountry, setValue])

  // Fetch previously saved store data from database
  useEffect(() => {
    const loadSavedStoreData = async () => {
      // Wait for countries and storeCategories to be loaded
      if (!user?.id || countries.length === 0 || storeCategories.length === 0) {
        console.log('⏳ Waiting for dependencies:', {
          hasUser: !!user?.id,
          countriesCount: countries.length,
          storeCategoriesCount: storeCategories.length
        })
        return
      }
      
      // Also wait for cities if country is already set (for when navigating back)
      const currentCountry = watch('storeCountry')
      if (currentCountry && cities.length === 0) {
        console.log('⏳ Waiting for cities to load for country:', currentCountry)
        // Wait a bit for cities to load
        let attempts = 0
        while (cities.length === 0 && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
      }

      try {
        // Get business_profile to find store_id
        const { data: businessProfile, error: profileError } = await supabase
          .from('business_profile')
          .select('store_id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('❌ Error fetching business profile:', profileError)
          return
        }

        if (!businessProfile?.store_id) {
          console.log('ℹ️ No store_id in business_profile yet')
          return // No store created yet
        }

        // Verify store_id is valid UUID format
        const storeId = businessProfile.store_id
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(storeId)) {
          console.warn('⚠️ Invalid store_id format:', storeId)
          return
        }

        console.log('🔍 Fetching store data for store_id:', storeId)

        // Fetch store data
        // Note: stores table uses 'country' (UUID) and 'city' (TEXT) columns, not country_id/city_id
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select(`
            name,
            name_ar,
            country,
            city,
            address,
            store_type,
            opening_hours,
            logo_url
          `)
          .eq('id', storeId)
          .maybeSingle()

        // Debug logging
        console.log('📊 Store query result:', {
          hasStore: !!store,
          hasError: !!storeError,
          errorType: storeError ? typeof storeError : 'none',
          errorString: storeError ? JSON.stringify(storeError) : 'none',
          storeId: storeId
        })

        // Check if we got store data first - if yes, use it regardless of error
        if (store) {
          console.log('✅ Store data fetched successfully:', store)
          // Continue to populate form below - ignore any error if we have data
        } else {
          // No store data - check if there's a meaningful error
          // Check if error is an empty object {} by stringifying it
          const errorString = storeError ? JSON.stringify(storeError) : ''
          const isEmptyError = errorString === '{}' || errorString === ''
          
          // Only check for real error if it's not empty
          // Explicitly check each property exists and has non-empty value
          if (!isEmptyError && storeError) {
            const message = storeError.message
            const code = storeError.code
            const details = storeError.details
            const hint = storeError.hint
            
            // Only consider it a real error if at least one property exists and is not empty
            const hasMessage = message !== undefined && message !== null && String(message).trim() !== ''
            const hasCode = code !== undefined && code !== null && String(code).trim() !== ''
            const hasDetails = details !== undefined && details !== null && String(details).trim() !== ''
            const hasHint = hint !== undefined && hint !== null && String(hint).trim() !== ''
            const hasRealError = hasMessage || hasCode || hasDetails || hasHint

            if (hasRealError) {
              // Real error with actual content - log it
              console.error('❌ Error fetching store:', {
                message: message,
                code: code,
                details: details,
                hint: hint,
                storeId: storeId,
                userId: user.id
              })
              return
            }
          }
          
          // If we reach here, it's an empty error object - don't log as error
          
          // Empty error or no error - store doesn't exist yet (normal for new users)
          console.log('ℹ️ No store data found (store might not exist yet):', {
            storeId: storeId,
            userId: user.id,
            isEmptyError: isEmptyError,
            errorString: errorString
          })
          return
        }


        // Fetch store categories separately from junction table
        let categoryIds: string[] = []
        if (businessProfile.store_id) {
          console.log('🔍 Fetching store categories for store_id:', businessProfile.store_id)
          const { data: storeCategoriesData, error: categoriesError } = await supabase
            .from('store_categories')
            .select('category_id')
            .eq('store_id', businessProfile.store_id)

          console.log('📊 Store categories query result:', {
            hasData: !!storeCategoriesData,
            count: storeCategoriesData?.length || 0,
            hasError: !!categoriesError,
            errorString: categoriesError ? JSON.stringify(categoriesError) : 'none'
          })

          if (categoriesError) {
            // Only log if it's a meaningful error
            const errorString = categoriesError ? JSON.stringify(categoriesError) : ''
            const isEmptyError = errorString === '{}' || errorString === ''
            if (!isEmptyError && (categoriesError.message || categoriesError.code)) {
              console.error('❌ Error fetching store categories:', categoriesError)
            } else {
              console.log('ℹ️ No store categories found or empty error (store might not have categories yet)')
            }
          } else if (storeCategoriesData && storeCategoriesData.length > 0) {
            categoryIds = storeCategoriesData.map((sc: any) => sc.category_id).filter((id: string) => id) // Filter out any null/undefined
            console.log('✅ Found store categories:', categoryIds, 'from', storeCategoriesData.length, 'records')
            
            // Verify these category IDs exist in the storeCategories list
            const validCategoryIds = categoryIds.filter(id => 
              storeCategories.some(cat => cat.id === id)
            )
            if (validCategoryIds.length !== categoryIds.length) {
              console.warn('⚠️ Some category IDs from database are not in the available categories list:', {
                found: categoryIds,
                valid: validCategoryIds,
                available: storeCategories.map(c => c.id).slice(0, 5)
              })
            }
            // Use only valid category IDs
            categoryIds = validCategoryIds
          } else {
            console.log('ℹ️ No store categories found for this store')
          }
        } else {
          console.log('ℹ️ No store_id in business_profile, skipping category fetch')
        }

        if (store) {
          console.log('📋 Loading saved store data from database:', store)
          
          // Populate form with saved data
          if (store.name) {
            setValue('storeName', store.name, { shouldValidate: true })
          }
          
          if (store.name_ar) {
            setValue('storeNameAr', store.name_ar, { shouldValidate: true })
          }
          
          // Note: stores table uses 'country' (UUID) and 'city' (TEXT/UUID as text)
          if (store.country) {
            console.log('🌍 Setting country:', store.country)
            setValue('storeCountry', store.country, { shouldValidate: true })
            
            // Wait for cities to load after country is set
            // The cities useEffect will trigger when storeCountry changes
            // Poll for cities to be loaded (max 3 seconds)
            let attempts = 0
            const maxAttempts = 30 // 30 attempts * 100ms = 3 seconds max
            while (cities.length === 0 && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100))
              attempts++
            }
            
            if (cities.length > 0) {
              console.log('✅ Cities loaded:', cities.length, 'cities')
            } else {
              console.warn('⚠️ Cities did not load after setting country')
            }
          }
          
          // City might be stored as UUID string or city name - need to find matching city
          if (store.city) {
            console.log('🏙️ Looking for city:', store.city, 'in cities list (length:', cities.length, ')')
            console.log('📋 Available cities:', cities.slice(0, 5).map(c => ({ id: c.id, name: c.name, name_ar: c.name_ar })))
            
            // Try multiple matching strategies
            let cityToUse = null
            
            // Strategy 1: Match by exact ID
            cityToUse = cities.find(c => c.id === store.city)
            if (cityToUse) {
              console.log('✅ Found city by ID:', cityToUse.name)
            }
            
            // Strategy 2: Match by name (case-insensitive)
            if (!cityToUse) {
              cityToUse = cities.find(c => 
                c.name?.toLowerCase().trim() === store.city?.toLowerCase().trim()
              )
              if (cityToUse) {
                console.log('✅ Found city by English name:', cityToUse.name)
              }
            }
            
            // Strategy 3: Match by Arabic name
            if (!cityToUse) {
              cityToUse = cities.find(c => c.name_ar === store.city)
              if (cityToUse) {
                console.log('✅ Found city by Arabic name:', cityToUse.name_ar)
              }
            }
            
            // Strategy 4: Partial match (contains)
            if (!cityToUse) {
              cityToUse = cities.find(c => 
                c.name?.toLowerCase().includes(store.city?.toLowerCase()) ||
                store.city?.toLowerCase().includes(c.name?.toLowerCase())
              )
              if (cityToUse) {
                console.log('✅ Found city by partial match:', cityToUse.name)
              }
            }
            
            if (cityToUse) {
              console.log('✅ Setting city:', cityToUse.name, 'ID:', cityToUse.id)
              setTimeout(() => {
                setValue('storeCity', cityToUse!.id, { shouldValidate: true })
                trigger('storeCity')
                console.log('✅ City set and validated')
              }, 100)
            } else {
              // If city is stored as name but not found in cities list, log a warning
              console.warn('⚠️ City not found in cities list:', {
                storedCity: store.city,
                storedCityType: typeof store.city,
                citiesCount: cities.length,
                countryId: store.country,
                availableCities: cities.slice(0, 10).map(c => ({ id: c.id, name: c.name, name_ar: c.name_ar, country_id: c.country_id }))
              })
              
              // Try multiple retry strategies with increasing delays
              const retryCityMatch = () => {
                // Strategy 1: Check if cities list has grown
                if (cities.length === 0) {
                  console.log('⏳ Cities list is still empty, will retry...')
                  return null
                }
                
                // Strategy 2: Try all matching strategies again
                let retryCity = cities.find(c => c.id === store.city)
                if (retryCity) {
                  console.log('✅ Found city on retry by ID:', retryCity.name)
                  return retryCity
                }
                
                retryCity = cities.find(c => 
                  c.name?.toLowerCase().trim() === store.city?.toLowerCase().trim()
                )
                if (retryCity) {
                  console.log('✅ Found city on retry by exact name:', retryCity.name)
                  return retryCity
                }
                
                retryCity = cities.find(c => c.name_ar === store.city)
                if (retryCity) {
                  console.log('✅ Found city on retry by Arabic name:', retryCity.name_ar)
                  return retryCity
                }
                
                // Strategy 3: Try partial matches (more lenient)
                retryCity = cities.find(c => 
                  c.name?.toLowerCase().includes(store.city?.toLowerCase()) ||
                  store.city?.toLowerCase().includes(c.name?.toLowerCase()) ||
                  (c.name_ar && c.name_ar.includes(store.city)) ||
                  (store.city && c.name_ar && store.city.includes(c.name_ar))
                )
                if (retryCity) {
                  console.log('✅ Found city on retry by partial match:', retryCity.name)
                  return retryCity
                }
                
                // Strategy 4: Try removing common prefixes/suffixes
                const cleanCityName = store.city?.replace(/^(city of|مدينة)\s*/i, '').trim()
                if (cleanCityName && cleanCityName !== store.city) {
                  retryCity = cities.find(c => 
                    c.name?.toLowerCase().trim() === cleanCityName.toLowerCase() ||
                    c.name_ar === cleanCityName
                  )
                  if (retryCity) {
                    console.log('✅ Found city on retry after cleaning name:', retryCity.name)
                    return retryCity
                  }
                }
                
                return null
              }
              
              // First retry after 1.5 seconds
              setTimeout(() => {
                const retryCity = retryCityMatch()
                if (retryCity) {
                  setValue('storeCity', retryCity.id, { shouldValidate: true })
                  trigger('storeCity')
                } else if (cities.length > 0) {
                  // If cities are loaded but still no match, log detailed info
                  console.error('❌ City still not found after retry. Details:', {
                    storedCity: store.city,
                    storedCityLength: store.city?.length,
                    citiesSample: cities.slice(0, 5).map(c => ({
                      id: c.id,
                      name: c.name,
                      name_ar: c.name_ar,
                      nameLower: c.name?.toLowerCase(),
                      storedCityLower: store.city?.toLowerCase()
                    })),
                    allCityNames: cities.map(c => c.name).slice(0, 10),
                    allCityNamesAr: cities.map(c => c.name_ar).filter(Boolean).slice(0, 10)
                  })
                } else {
                  console.warn('⚠️ Cities list is still empty after retry')
                }
              }, 1500)
              
              // Second retry after 3 seconds (in case cities are loading very slowly)
              setTimeout(() => {
                const retryCity = retryCityMatch()
                if (retryCity) {
                  console.log('✅ Found city on second retry:', retryCity.name)
                  setValue('storeCity', retryCity.id, { shouldValidate: true })
                  trigger('storeCity')
                }
              }, 3000)
            }
          }
          
          if (store.address) {
            setValue('storeAddress', store.address, { shouldValidate: true })
          }
          
          // Note: stores table uses 'store_type' (array), not 'store_types'
          // Handle both array format (new) and single value format (old)
          if (store.store_type) {
            if (Array.isArray(store.store_type)) {
              console.log('✅ Setting store type (array):', store.store_type)
              setValue('storeType', store.store_type as ('online' | 'retail' | 'hybrid' | 'pop_up')[], { shouldValidate: true })
            } else if (typeof store.store_type === 'string') {
              // Single value - convert to array
              console.log('✅ Setting store type (single value, converting to array):', store.store_type)
              setValue('storeType', [store.store_type] as ('online' | 'retail' | 'hybrid' | 'pop_up')[], { shouldValidate: true })
            }
          }
          
          if (store.opening_hours) {
            setValue('openingHours', store.opening_hours as Record<string, { open: string; close: string; closed: boolean }>, { shouldValidate: true })
          }
          
          // Handle logo URL - set preview if logo exists
          if (store.logo_url) {
            console.log('🖼️ Setting logo preview from URL:', store.logo_url)
            setLogoPreview(store.logo_url)
            // Note: We don't set logoFile here because it's a File object, not a URL
            // The preview will show the existing logo from the URL
          }
          
          // Handle categories from junction table
          // Make sure categories are set after a small delay to ensure form state is ready
          if (categoryIds.length > 0) {
            console.log('📦 Category IDs from database:', categoryIds)
            console.log('📋 Available store categories count:', storeCategories.length)
            console.log('📋 Available store category IDs:', storeCategories.map(c => c.id).slice(0, 10))
            console.log('📋 Available store category names:', storeCategories.map(c => ({ id: c.id, name: c.name })).slice(0, 5))
            
            // Double-check that all category IDs exist in storeCategories
            const finalCategoryIds = categoryIds.filter(id => {
              const exists = storeCategories.some(cat => cat.id === id)
              if (!exists) {
                console.warn('⚠️ Category ID not found in available categories:', id)
              }
              return exists
            })
            
            console.log('✅ Valid category IDs after filtering:', finalCategoryIds)
            console.log('📊 Filtering result:', {
              originalCount: categoryIds.length,
              validCount: finalCategoryIds.length,
              removed: categoryIds.filter(id => !finalCategoryIds.includes(id))
            })
            
            if (finalCategoryIds.length > 0) {
              console.log('✅ Setting categories to form:', finalCategoryIds)
              // Set immediately first
              setValue('storeCategory', finalCategoryIds, { shouldValidate: true })
              
              // Also set after a delay to ensure form state is ready
              setTimeout(() => {
                setValue('storeCategory', finalCategoryIds, { shouldValidate: true })
                trigger('storeCategory')
                
                // Verify it was set
                const currentValue = watch('storeCategory')
                console.log('✅ Categories set, current form value:', currentValue)
                console.log('✅ Validation triggered for storeCategory')
              }, 300)
              
              // One more retry after longer delay
              setTimeout(() => {
                const currentValue = watch('storeCategory')
                if (!currentValue || currentValue.length === 0) {
                  console.warn('⚠️ Categories not set, retrying...')
                  setValue('storeCategory', finalCategoryIds, { shouldValidate: true })
                  trigger('storeCategory')
                } else {
                  console.log('✅ Categories confirmed set:', currentValue)
                }
              }, 800)
            } else {
              console.error('❌ No valid categories found after filtering:', {
                original: categoryIds,
                available: storeCategories.map(c => c.id).slice(0, 10),
                availableNames: storeCategories.map(c => ({ id: c.id, name: c.name })).slice(0, 10)
              })
            }
          } else {
            console.log('ℹ️ No categories to set (categoryIds is empty)')
          }
          
          // Trigger validation after setting all values to enable the button
          // Use a longer timeout to ensure all async operations complete
          setTimeout(() => {
            console.log('🔍 Triggering form validation...')
            trigger()
          }, 500)
        }
      } catch (error) {
        console.error('❌ Error loading saved store data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadSavedStoreData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, countries.length, storeCategories.length, cities.length])

  // Fetch business types
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      try {
        const { data: businessTypesData, error } = await supabase
          .from('business_types')
          .select('id, slug, name_en, name_ar, icon, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (error) {
          console.error('Error fetching business types:', error)
          toast.error('Error', {
            description: error.message || 'Failed to load business types.',
            duration: 5000,
          })
          setIsLoadingBusinessTypes(false)
          return
        }
        
        if (businessTypesData && businessTypesData.length > 0) {
          const formatted = businessTypesData.map((item: any) => ({
            id: item.id,
            name: item.name_en,
            value: item.slug || item.id,
            icon: item.icon,
            name_ar: item.name_ar
          }))
          setBusinessTypes(formatted)
        } else {
          setBusinessTypes([])
        }
      } catch (error: any) {
        console.error('Unexpected error fetching business types:', error)
        toast.error('Error', {
          description: error?.message || 'Failed to load business types. Please refresh the page.',
          duration: 5000,
        })
      } finally {
        setIsLoadingBusinessTypes(false)
      }
    }

    fetchBusinessTypes()
  }, [])

  // Fetch store categories
  useEffect(() => {
    const fetchStoreCategories = async () => {
      try {
        setIsLoadingStoreCategories(true)
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, name_ar, slug, icon')
          .eq('is_active', true)
          .is('parent_id', null) // Only get top-level categories
          .order('name', { ascending: true })

        if (error) {
          console.error('Error fetching store categories:', error)
          toast.error('Error', {
            description: 'Failed to load store categories. Please try again.',
            duration: 5000,
          })
          setStoreCategories([])
          return
        }

        if (data && data.length > 0) {
          // Map the data to StoreCategory format
          const categories = data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            name_ar: cat.name_ar,
            slug: cat.slug,
            icon: cat.icon,
          }))
          setStoreCategories(categories)
        } else {
          setStoreCategories([])
        }
      } catch (error: any) {
        console.error('Error fetching store categories:', error)
        toast.error('Error', {
          description: 'Failed to load store categories. Please try again.',
          duration: 5000,
        })
        setStoreCategories([])
      } finally {
        setIsLoadingStoreCategories(false)
      }
    }

    fetchStoreCategories()
  }, [])

  const onSubmit = async (values: SetupFormData) => {
    setIsSubmitting(true)

    try {
      const selectedCountryData = countries.find(c => c.id === values.storeCountry)
      if (!selectedCountryData) {
        throw new Error('Please select a valid country')
      }

      // At least one store name (English or Arabic) must be provided
      const hasEnglishName = values.storeName && values.storeName.trim().length >= 2
      const hasArabicName = values.storeNameAr && values.storeNameAr.trim().length >= 2
      if (!hasEnglishName && !hasArabicName) {
        throw new Error('At least one store name (English or Arabic) is required')
      }
      if (!values.storeCategory || values.storeCategory.length === 0) {
        throw new Error('Please select at least one store category')
      }
      if (!values.storeCity) {
        throw new Error('City is required')
      }

      const urlCountry = parseLocaleCountry(pathname)
      let preferredCountry = urlCountry?.country || selectedCountryData?.iso2
      let preferredLanguage = urlCountry?.locale || locale

      if (!urlCountry) {
        const cookieCountry = getLocaleCountryFromCookies()
        if (cookieCountry) {
          preferredCountry = cookieCountry.country
          preferredLanguage = cookieCountry.locale
        }
      }

      preferredCountry = preferredCountry || selectedCountryData?.iso2 || 'SA'
      preferredLanguage = preferredLanguage || locale || 'en'

      // Step 1: Create store first (to get store_id for logo upload) with timeout protection
      const rpcCall = supabase.rpc('save_store_details_onboarding', {
        p_store_name: values.storeName?.trim() || null,
        p_store_name_ar: values.storeNameAr?.trim() || null,
        p_category_ids: values.storeCategory,
        p_store_types: values.storeType || ['online'], // Multi-select array
        p_country_id: values.storeCountry,
        p_city_id: values.storeCity,
        p_address: values.storeAddress?.trim() || null,
        p_opening_hours: values.openingHours && Object.keys(values.openingHours).length > 0 ? values.openingHours : null,
        p_logo_url: null, // Will be set after upload if logo exists
      })
      
      // Add timeout to prevent infinite loading (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout. Please check your connection and try again.'))
        }, 30000)
      })
      
      const result = await Promise.race([rpcCall, timeoutPromise])
      const { data: storeData, error: storeError } = result

      if (storeError) {
        throw new Error(storeError.message)
      }

      if (!storeData?.success) {
        throw new Error(storeData?.error || 'Failed to save store details')
      }

      const storeId = storeData.store_id
      let logoUrl: string | null = null

      // Step 2: Upload logo if provided
      if (logoFile && storeId) {
        try {
          setLoading(true, locale === 'ar' ? 'جاري رفع الشعار...' : 'Uploading logo...')
          
          const logoFormData = new FormData()
          logoFormData.append('file', logoFile)
          logoFormData.append('storeId', storeId)

          const uploadResponse = await fetch('/api/stores/upload-logo', {
            method: 'POST',
            body: logoFormData,
          })

          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.json()
            throw new Error(uploadError.error || 'Failed to upload logo')
          }

          const uploadData = await uploadResponse.json()
          logoUrl = uploadData.logo_url

          // Logo URL is already updated in the API route, so we don't need to update again
          console.log('Logo uploaded successfully:', logoUrl)
        } catch (logoError: any) {
          console.error('Logo upload error:', logoError)
          // Don't fail the whole process if logo upload fails
          toast.error('Warning', {
            description: logoError?.message || 'Store created but logo upload failed. You can add it later.',
            duration: 5000,
          })
        } finally {
          setLoading(false)
        }
      }

      console.log('Store details saved:', { ...storeData, logo_url: logoUrl })

      // Also save to cookies as backup
      FormStateCookies.clearFormDraft('business_setup')
      FormStateCookies.saveLastFormData('business_setup', {
        ...values,
        storeId: storeData.store_id,
        businessProfileId: storeData.business_profile_id,
        slug: storeData.slug,
        logoUrl,
      })
      UserPreferencesCookies.setCountry(preferredCountry)
      UserPreferencesCookies.setLocale(preferredLanguage)

      // Show success toast
      toast.solid.success(locale === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully')

      // Proceed to next step with timeout protection
      try {
        const nextStepPromise = onNext()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), 10000)
        )
        
        await Promise.race([nextStepPromise, timeoutPromise])
      } catch (nextError: any) {
        // If navigation fails, still consider the form submitted successfully
        // The data is already saved, so we can manually navigate
        console.warn('Navigation error (data already saved):', nextError)
        
        // Try to navigate manually if onNext fails
        const currentPath = pathname
        const nextStepPath = currentPath.replace(/\/[^/]+$/, '/summary')
        router.push(nextStepPath)
      }
      
    } catch (err: any) {
      console.error('Error creating business:', err)
      
      const errorMessage = 
        err?.message || 
        err?.error?.message ||
        err?.details || 
        err?.hint || 
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        (err?.toString && err.toString() !== '[object Object]' ? err.toString() : null) ||
        'Failed to create business. Please try again.'
      
      toast.error('Error', {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Error', {
          description: 'Please select an image file',
          duration: 5000,
        })
        return
      }
      
      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        toast.error('Error', {
          description: 'Image size must be less than 2MB',
          duration: 5000,
        })
        return
      }
      
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    // Reset the file input
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Loading skeleton while fetching data
  if (isLoadingData) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Logo skeleton */}
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Skeleton className="w-24 h-24 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>
        {/* Store Name skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Store Name Arabic skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Store Category skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Store Type skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Country skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* City skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Address skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Opening Hours skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Button skeleton */}
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Logo Upload */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative">
              <div className="w-24 h-24 rounded-xl border border-gray-200 overflow-hidden bg-white">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove logo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <label
                htmlFor="logo-upload"
                className="w-24 h-24 border border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-orange-50 hover:border-[#F4610B] flex items-center justify-center cursor-pointer transition-colors relative"
                onMouseEnter={() => setIsLogoHovered(true)}
                onMouseLeave={() => setIsLogoHovered(false)}
              >
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <Store 
                    className={`h-8 w-8 text-gray-600 absolute inset-0 transition-opacity duration-200 ${
                      isLogoHovered ? 'opacity-0' : 'opacity-100'
                    }`} 
                  />
                  <Upload 
                    className={`h-6 w-6 transition-all duration-200 ${
                      isLogoHovered ? 'opacity-100 text-[#F4610B]' : 'opacity-0 text-gray-600'
                    }`} 
                  />
                </div>
              </label>
              <div className="flex-1">
                <p className="text-sm text-gray-600">{t.uploadLogo}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.logoFormat}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Store Name */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={isStoreNameArabic ? 'storeNameAr' : 'storeName'} className={focusedField === 'storeName' || focusedField === 'storeNameAr' ? 'text-[#F4610B]' : ''}>
            {t.storeName}
          </Label>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${!isStoreNameArabic ? 'text-[#F4610B]' : 'text-gray-500'}`}>
              EN
            </span>
            <Switch
              checked={isStoreNameArabic}
              onCheckedChange={setIsStoreNameArabic}
              className="data-[state=checked]:bg-[#F4610B]"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <span className={`text-xs font-medium ${isStoreNameArabic ? 'text-[#F4610B]' : 'text-gray-500'}`}>
              AR
            </span>
          </div>
        </div>
        {!isStoreNameArabic ? (
          <Input
            ref={storeNameInputRef}
            id="storeName"
            name="storeName"
            value={storeName || ''}
            placeholder={t.storeNamePlaceholder}
            lang="en"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!isStoreNameArabic}
            onFocus={() => setFocusedField('storeName')}
            onBlur={() => {
              setFocusedField(null)
              trigger('storeName')
            }}
            onChange={(e) => {
              setValue('storeName', e.target.value, { shouldValidate: true, shouldDirty: true })
            }}
            className={`h-12 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${errors.storeName ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : '!border-gray-300'}`}
            disabled={isSubmitting}
            dir="ltr"
          />
        ) : (
          <Input
            ref={storeNameArInputRef}
            id="storeNameAr"
            name="storeNameAr"
            value={storeNameAr || ''}
            placeholder={locale === 'ar' ? 'اسم متجرك بالعربية' : 'Your store name in Arabic'}
            lang="ar"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            autoFocus={isStoreNameArabic}
            onFocus={() => setFocusedField('storeNameAr')}
            onBlur={() => {
              setFocusedField(null)
              trigger('storeNameAr')
            }}
            onChange={(e) => {
              setValue('storeNameAr', e.target.value, { shouldValidate: true, shouldDirty: true })
            }}
            className={`h-12 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${errors.storeNameAr ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : '!border-gray-300'}`}
            disabled={isSubmitting}
            dir="rtl"
          />
        )}
        
        {/* Checklist */}
        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-4 mt-2 flex-wrap`}>
          <div className={`flex items-center gap-2 text-xs ${storeName && storeName.trim().length >= 2 ? 'text-green-600' : 'text-red-500'}`}>
            {storeName && storeName.trim().length >= 2 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-red-500" />
            )}
            <span>{locale === 'ar' ? 'اسم المتجر بالإنجليزية' : 'English store name'}</span>
          </div>
          <div className={`flex items-center gap-2 text-xs ${storeNameAr && storeNameAr.trim().length >= 2 ? 'text-green-600' : 'text-red-500'}`}>
            {storeNameAr && storeNameAr.trim().length >= 2 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-red-500" />
            )}
            <span>{locale === 'ar' ? 'اسم المتجر بالعربية' : 'Arabic store name'}</span>
          </div>
        </div>
      </div>

      {/* Store Category */}
      <div className="space-y-2">
        <Label htmlFor="storeCategory" className={isStoreCategoryOpen ? 'text-[#F4610B]' : ''}>
          {t.storeCategory}
        </Label>
          <DropdownMenu open={isStoreCategoryOpen} onOpenChange={setIsStoreCategoryOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={`h-12 w-full justify-between rounded-md shadow-xs bg-transparent hover:bg-transparent border-[1px] hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isStoreCategoryOpen ? '!border-orange-500 !ring-1 !ring-orange-500' : ''} ${errors.storeCategory ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : isStoreCategoryOpen ? '' : '!border-gray-300'}`}
                disabled={isSubmitting || isLoadingStoreCategories}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                  {isLoadingStoreCategories ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-gray-500">Loading...</span>
                    </>
                  ) : selectedStoreCategories.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                      {selectedStoreCategories.slice(0, 3).map((cat, index) => (
                        <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-md text-sm text-[#F4610B] font-medium min-w-0 max-w-[30%]">
                          {cat.icon && <span className="text-sm flex-shrink-0">{cat.icon}</span>}
                          <span className="truncate">{locale === 'ar' && cat.name_ar ? cat.name_ar : cat.name}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">{t.selectStoreCategory}</span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-0" align={isRTL ? 'end' : 'start'}>
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200 sticky top-0 bg-white z-10 space-y-2">
                <div className="relative">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
                  <Input
                    type="text"
                    placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className={`h-9 ${isRTL ? 'pr-9 text-right' : 'pl-9'} text-sm !border-gray-300 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                {/* Selection Counter */}
                {(storeCategory?.length || 0) > 0 && (
                  <div className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className="text-[#F4610B] font-medium">
                      {locale === 'ar' ? `${storeCategory?.length || 0} من 3 محددة` : `${storeCategory?.length || 0} of 3 selected`}
                    </span>
                  </div>
                )}
              </div>

              {/* Categories List */}
              <div className="max-h-[300px] overflow-y-auto p-1 scrollbar-minimal">
                {isLoadingStoreCategories ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    {categorySearch ? (locale === 'ar' ? 'لا توجد نتائج' : 'No results found') : (locale === 'ar' ? 'لا توجد فئات متاحة' : 'No categories available')}
                  </div>
                ) : (
                  filteredCategories.map((category) => {
                    const isSelected = storeCategory?.includes(category.id) || false
                    const isMaxReached = (storeCategory?.length || 0) >= 3 && !isSelected
                    return (
                      <DropdownMenuItem
                        key={category.id}
                        onClick={(e) => {
                          e.preventDefault()
                          const currentCategories = storeCategory || []
                          
                          // If trying to add and already at max (3), show toast and return
                          if (!isSelected && currentCategories.length >= 3) {
                            toast.error('Maximum Selection', {
                              description: locale === 'ar' ? 'يمكنك اختيار 3 فئات كحد أقصى' : 'You can select up to 3 categories maximum',
                              duration: 3000,
                            })
                            return
                          }
                          
                          const newCategories = isSelected
                            ? currentCategories.filter(id => id !== category.id)
                            : [...currentCategories, category.id]
                          setValue('storeCategory', newCategories, { shouldValidate: true })
                        }}
                        className={`cursor-pointer rounded-lg h-10 flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''} ${isMaxReached ? 'opacity-50 cursor-not-allowed' : ''} ${isSelected ? '!bg-orange-100' : 'hover:!bg-orange-50 focus:!bg-orange-50'}`}
                        disabled={isMaxReached}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isMaxReached}
                          className="h-4 w-4 data-[state=checked]:bg-[#F4610B] data-[state=checked]:border-[#F4610B] focus-visible:ring-[#F4610B]/50 focus-visible:border-[#F4610B]"
                          onCheckedChange={() => {}}
                        />
                        {category.icon && <span className="text-lg">{category.icon}</span>}
                        <span className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                          {locale === 'ar' && category.name_ar ? category.name_ar : category.name}
                        </span>
                      </DropdownMenuItem>
                    )
                  })
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        {errors.storeCategory && (
          <p className="text-xs text-red-500">{errors.storeCategory.message}</p>
        )}
      </div>

      {/* Store Type */}
      <div className="space-y-2">
        <Label htmlFor="storeType" className={isStoreTypeOpen ? 'text-[#F4610B]' : ''}>
          {t.storeType}
        </Label>
        <DropdownMenu open={isStoreTypeOpen} onOpenChange={setIsStoreTypeOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`h-12 w-full justify-between rounded-md shadow-xs bg-transparent hover:bg-transparent border-[1px] hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isStoreTypeOpen ? '!border-orange-500 !ring-1 !ring-orange-500' : ''} ${errors.storeType ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : isStoreTypeOpen ? '' : '!border-gray-300'}`}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                {selectedStoreTypes.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                    {selectedStoreTypes.slice(0, 3).map((type) => (
                      <span key={type.value} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-md text-sm text-[#F4610B] font-medium min-w-0 max-w-[30%]">
                        <Store className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{type.label}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">{t.selectStoreType}</span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-0" align={isRTL ? 'end' : 'start'}>
            {/* Selection Counter */}
            {(storeType?.length || 0) > 0 && (
              <div className="p-2 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                  <span className="text-[#F4610B] font-medium">
                    {locale === 'ar' ? `${storeType?.length || 0} من 4 محددة` : `${storeType?.length || 0} of 4 selected`}
                  </span>
                </div>
              </div>
            )}

            {/* Store Types List */}
            <div className="max-h-[300px] overflow-y-auto p-1 scrollbar-minimal">
              {storeTypeOptions.map((type) => {
                const isSelected = storeType?.includes(type.value as 'online' | 'retail' | 'hybrid' | 'pop_up') || false
                const isMaxReached = (storeType?.length || 0) >= 4 && !isSelected
                return (
                  <DropdownMenuItem
                    key={type.value}
                    onClick={(e) => {
                      e.preventDefault()
                      const currentTypes = storeType || []
                      
                      // If trying to add and already at max (4), show toast and return
                      if (!isSelected && currentTypes.length >= 4) {
                        toast.error('Maximum Selection', {
                          description: locale === 'ar' ? 'يمكنك اختيار 4 أنواع متاجر كحد أقصى' : 'You can select up to 4 store types maximum',
                          duration: 3000,
                        })
                        return
                      }
                      
                      const newTypes = isSelected
                        ? currentTypes.filter(t => t !== type.value)
                        : [...currentTypes, type.value as 'online' | 'retail' | 'hybrid' | 'pop_up']
                      setValue('storeType', newTypes as ('online' | 'retail' | 'hybrid' | 'pop_up')[], { shouldValidate: true })
                    }}
                    className={`cursor-pointer rounded-lg h-10 flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''} ${isMaxReached ? 'opacity-50 cursor-not-allowed' : ''} ${isSelected ? '!bg-orange-100' : 'hover:!bg-orange-50 focus:!bg-orange-50'}`}
                    disabled={isMaxReached}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isMaxReached}
                      className="h-4 w-4 data-[state=checked]:bg-[#F4610B] data-[state=checked]:border-[#F4610B] focus-visible:ring-[#F4610B]/50 focus-visible:border-[#F4610B]"
                      onCheckedChange={() => {}}
                    />
                    <Store className="h-4 w-4" />
                    <span className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      {type.label}
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {errors.storeType && (
          <p className="text-xs text-red-500">{errors.storeType.message}</p>
        )}
      </div>

      {/* Address - Show when retail is selected */}
      {hasRetailStoreType && (
        <div className="space-y-2">
          <Label htmlFor="storeAddress" className={focusedField === 'storeAddress' ? 'text-[#F4610B]' : ''}>
            {t.storeAddress}
          </Label>
          <Input
            id="storeAddress"
            {...register('storeAddress')}
            placeholder={t.storeAddressPlaceholder}
            onFocus={() => setFocusedField('storeAddress')}
            onBlur={() => setFocusedField(null)}
            className={`h-12 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${errors.storeAddress ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : '!border-gray-300'}`}
            disabled={isSubmitting}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          {errors.storeAddress && (
            <p className="text-xs text-red-500">{errors.storeAddress.message}</p>
          )}
        </div>
      )}

      {/* Country and City */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="storeCountry" className={isStoreCountryOpen ? 'text-[#F4610B]' : ''}>
            {t.storeCountry}
          </Label>
          <DropdownMenu open={isStoreCountryOpen} onOpenChange={setIsStoreCountryOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={`h-12 w-full justify-between rounded-md shadow-xs bg-transparent hover:bg-transparent border-[1px] hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isStoreCountryOpen ? '!border-orange-500 !ring-1 !ring-orange-500' : ''} ${errors.storeCountry ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : isStoreCountryOpen ? '' : '!border-gray-300'}`}
                disabled={isSubmitting || isLoadingCountries}
              >
                <div className="flex items-center gap-2">
                  {isLoadingCountries ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-gray-500">Loading countries...</span>
                    </>
                  ) : selectedStoreCountry ? (
                    <>
                      <Flag countryName={selectedStoreCountry.name} flagUrl={selectedStoreCountry.flag_url} size="s" />
                      <span>{locale === 'ar' && selectedStoreCountry.name_ar ? selectedStoreCountry.name_ar : selectedStoreCountry.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">{t.selectStoreCountry}</span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-1 max-h-[300px] overflow-y-auto" align={isRTL ? 'end' : 'start'}>
              {isLoadingCountries ? (
                <DropdownMenuItem disabled>
                  <span className="text-gray-500">Loading countries...</span>
                </DropdownMenuItem>
              ) : countries.length === 0 ? (
                <DropdownMenuItem disabled>
                  <span className="text-gray-500">No countries available</span>
                </DropdownMenuItem>
              ) : (
                countries.map((country) => {
                  if (!country || !country.id || !country.name) {
                    return null
                  }
                  return (
                    <DropdownMenuItem
                      key={country.id}
                      onClick={() => {
                        setValue('storeCountry', country.id, { shouldValidate: true })
                      }}
                      className={`cursor-pointer rounded-lg h-10 mb-1 hover:!bg-orange-50 focus:!bg-orange-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Flag countryName={country.name} flagUrl={country.flag_url} size="s" rounded={false} />
                      <span className={isRTL ? 'text-right flex-1' : ''}>{locale === 'ar' && country.name_ar ? country.name_ar : country.name}</span>
                    </DropdownMenuItem>
                  )
                }).filter(Boolean)
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {errors.storeCountry && (
            <p className="text-xs text-red-500">{errors.storeCountry.message}</p>
          )}
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="storeCity" className={isStoreCityOpen ? 'text-[#F4610B]' : ''}>
            {t.storeCity}
          </Label>
          <DropdownMenu open={isStoreCityOpen} onOpenChange={setIsStoreCityOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={`h-12 w-full justify-between rounded-md shadow-xs bg-transparent hover:bg-transparent border-[1px] hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isStoreCityOpen ? '!border-orange-500 !ring-1 !ring-orange-500' : ''} ${errors.storeCity ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : isStoreCityOpen ? '' : '!border-gray-300'}`}
                disabled={isSubmitting || isLoadingCities || !storeCountry}
              >
                <div className="flex items-center gap-2">
                  {isLoadingCities ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-gray-500">Loading cities...</span>
                    </>
                  ) : selectedCity ? (
                    <span>{locale === 'ar' && selectedCity.name_ar ? selectedCity.name_ar : selectedCity.name}</span>
                  ) : (
                    <span className="text-gray-500">
                      {storeCountry ? (locale === 'ar' ? 'اختر المدينة' : 'Select city') : (locale === 'ar' ? 'اختر البلد أولاً' : 'Select country first')}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-1 max-h-[300px] overflow-y-auto" align={isRTL ? 'end' : 'start'}>
              {isLoadingCities ? (
                <DropdownMenuItem disabled>
                  <span className="text-gray-500">Loading cities...</span>
                </DropdownMenuItem>
              )               : cities.length === 0 ? (
                <DropdownMenuItem disabled>
                  <span className="text-gray-500">
                    {storeCountry ? (locale === 'ar' ? 'لا توجد مدن متاحة' : 'No cities available') : (locale === 'ar' ? 'اختر البلد أولاً' : 'Select country first')}
                  </span>
                </DropdownMenuItem>
              ) : (
                cities.map((city) => (
                  <DropdownMenuItem
                    key={city.id}
                    onClick={() => {
                      setValue('storeCity', city.id, { shouldValidate: true })
                    }}
                    className={`cursor-pointer rounded-lg h-10 mb-1 hover:!bg-orange-50 focus:!bg-orange-50 ${isRTL ? 'text-right' : ''}`}
                  >
                    <span className={isRTL ? 'text-right w-full' : ''}>{locale === 'ar' && city.name_ar ? city.name_ar : city.name}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {errors.storeCity && (
            <p className="text-xs text-red-500">{errors.storeCity.message}</p>
          )}
        </div>
      </div>

      {/* Opening Hours - Only show for physical store types */}
      {hasPhysicalStoreType && (
        <div className="space-y-2">
          <Label htmlFor="openingHours" className={isOpeningHoursOpen ? 'text-[#F4610B]' : ''}>
            {locale === 'ar' ? 'ساعات العمل' : 'Opening Hours'}
          </Label>
          <DropdownMenu open={isOpeningHoursOpen} onOpenChange={setIsOpeningHoursOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={`h-12 w-full justify-between rounded-md shadow-xs bg-transparent hover:bg-transparent border-[1px] hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isOpeningHoursOpen ? '!border-orange-500 !ring-1 !ring-orange-500' : ''} ${errors.openingHours ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : isOpeningHoursOpen ? '' : '!border-gray-300'}`}
                disabled={isSubmitting}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-gray-700">
                    {openingHours && Object.keys(openingHours).length > 0
                      ? locale === 'ar' 
                        ? `${Object.keys(openingHours).filter(day => !openingHours[day]?.closed).length} أيام مفتوحة`
                        : `${Object.keys(openingHours).filter(day => !openingHours[day]?.closed).length} days open`
                      : locale === 'ar' 
                        ? 'اختر ساعات العمل'
                        : 'Select opening hours'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-0" 
              align={isRTL ? 'end' : 'start'}
            >
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const dayKey = day.toLowerCase()
                  const dayHours = openingHours?.[dayKey] || { open: '09:00', close: '00:00', closed: false }
                  
                  // Day name translations
                  const dayNames: Record<string, { en: string; ar: string }> = {
                    monday: { en: 'Mon', ar: 'الاثنين' },
                    tuesday: { en: 'Tue', ar: 'الثلاثاء' },
                    wednesday: { en: 'Wed', ar: 'الأربعاء' },
                    thursday: { en: 'Thu', ar: 'الخميس' },
                    friday: { en: 'Fri', ar: 'الجمعة' },
                    saturday: { en: 'Sat', ar: 'السبت' },
                    sunday: { en: 'Sun', ar: 'الأحد' },
                  }
                  
                  const dayName = dayNames[dayKey] || { en: day.slice(0, 3), ar: day.slice(0, 3) }
                  
                  const isDayFocused = focusedTimeInput === `${dayKey}-open` || focusedTimeInput === `${dayKey}-close`
                  
                  return (
                    <div key={day} className={`flex items-center gap-3 text-sm ${isRTL ? 'flex-row-reverse' : ''} ${dayHours.closed ? 'opacity-50' : ''}`}>
                      <div className={`w-20 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'} ${dayHours.closed ? 'text-gray-400' : 'text-[#F4610B]'}`}>
                        {locale === 'ar' ? dayName.ar : dayName.en}
                      </div>
                      <Checkbox
                        id={`${day}-closed`}
                        checked={dayHours.closed}
                        onCheckedChange={(checked) => handleOpeningHoursChange(dayKey, 'closed', checked === true)}
                        className="h-4 w-4 data-[state=checked]:bg-[#F4610B] data-[state=checked]:border-[#F4610B]"
                      />
                      <Label htmlFor={`${day}-closed`} className={`text-sm cursor-pointer ${dayHours.closed ? 'text-gray-400' : (focusedTimeInput === `${dayKey}-open` || focusedTimeInput === `${dayKey}-close`) ? 'text-[#F4610B]' : 'text-gray-600'}`}>
                        {locale === 'ar' ? 'مغلق' : 'Closed'}
                      </Label>
                      <Input
                        id={`${dayKey}-open`}
                        type="time"
                        value={dayHours.open || '09:00'}
                        onChange={(e) => handleOpeningHoursChange(dayKey, 'open', e.target.value)}
                        onFocus={() => setFocusedTimeInput(`${dayKey}-open`)}
                        onBlur={() => setFocusedTimeInput(null)}
                        disabled={dayHours.closed}
                        className={`h-9 w-24 text-sm ${dayHours.closed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <span className={`text-sm ${dayHours.closed ? 'text-gray-400' : (focusedTimeInput === `${dayKey}-open` || focusedTimeInput === `${dayKey}-close`) ? 'text-[#F4610B]' : 'text-gray-400'}`}>-</span>
                      <Input
                        id={`${dayKey}-close`}
                        type="time"
                        value={dayHours.close || '00:00'}
                        onChange={(e) => handleOpeningHoursChange(dayKey, 'close', e.target.value)}
                        onFocus={() => setFocusedTimeInput(`${dayKey}-close`)}
                        onBlur={() => setFocusedTimeInput(null)}
                        disabled={dayHours.closed}
                        className={`h-9 w-24 text-sm ${dayHours.closed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  )
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {errors.openingHours && typeof errors.openingHours === 'object' && 'message' in errors.openingHours && (
            <p className="text-xs text-red-500">{String(errors.openingHours.message)}</p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-start pt-4 w-full">
        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="h-12 px-6 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t.creating}
            </>
          ) : (
            t.continue
          )}
        </Button>
      </div>
    </form>
  )
}

