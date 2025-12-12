'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Building2, Store, Globe, ChevronDown, User, Phone } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useLoading } from '@/lib/loading-context';
import { Flag } from '@/components/flag';
import { useLocale } from '@/i18n/context';
import { parseLocaleCountry, getLocaleCountryFromCookies } from '@/lib/localized-url';
import { useAuth } from '@/lib/auth/auth-context';

interface Country {
  id: string;
  name: string;
  name_ar?: string;
  iso2: string;
  iso3?: string;
  phone_code?: string;
}

interface BusinessType {
  id?: string;
  name: string;
  value?: string;
  icon?: string;
  name_ar?: string;
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
  },
};

// Create schema with locale-aware error messages
const createSetupSchema = (locale: 'en' | 'ar' = 'en') => {
  const errors = errorMessages[locale];
  
  return z.object({
    fullName: z
      .string()
      .min(2, errors.fullName.min)
      .max(100, errors.fullName.max)
      .regex(
        /^[a-zA-Z\u0600-\u06FF\s'-]+$/,
        errors.fullName.regex
      )
      .refine(
        (val) => val.trim().split(/\s+/).length >= 2,
        errors.fullName.fullName
      )
      .refine(
        (val) => !/^\s|\s$/.test(val),
        errors.fullName.spaces
      ),
    businessName: z
      .string()
      .min(2, errors.businessName.min)
      .max(100, errors.businessName.max)
      .regex(
        /^[a-zA-Z0-9\u0600-\u06FF\s&.,'-]+$/,
        errors.businessName.regex
      )
      .refine(
        (val) => !/^\s|\s$/.test(val),
        errors.businessName.spaces
      )
      .refine(
        (val) => !/\s{2,}/.test(val),
        errors.businessName.consecutiveSpaces
      ),
    country: z
      .string()
      .min(1, errors.country.required),
    businessType: z
      .string()
      .min(1, errors.businessType.required),
    mobilePhone: z
      .string()
      .min(8, errors.mobilePhone.min)
      .max(20, errors.mobilePhone.max)
      .regex(/^[+]?[\d\s\-()]+$/, errors.mobilePhone.regex),
  });
};

type SetupFormData = z.infer<ReturnType<typeof createSetupSchema>>;

// Translations
const translations = {
  en: {
    title: 'Set Up Your Business',
    subtitle: 'Tell us about your business to get started with Haady',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Your full name',
    country: 'Country',
    selectCountry: 'Select your country',
    mobilePhone: 'Mobile Phone',
    businessName: 'Business Name',
    businessNamePlaceholder: 'Your Company Name',
    businessType: 'Business Type',
    selectBusinessType: 'Select business type',
    createBusiness: 'Create Business',
    creating: 'Creating your business...',
    footer: "By continuing, you agree to Haady's Terms of Service and Privacy Policy",
  },
  ar: {
    title: 'خلّينا نجهّز نشاطك التجاري',
    subtitle: 'شاركنا شوية معلومات عن نشاطك عشان نبدأ مع هادي',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'اسمك الكامل',
    country: 'البلد',
    selectCountry: 'اختر بلدك',
    mobilePhone: 'رقم الجوال',
    businessName: 'اسم العمل',
    businessNamePlaceholder: 'اسم شركتك',
    businessType: 'نوع العمل',
    selectBusinessType: 'اختر نوع العمل',
    createBusiness: 'إنشاء العمل',
    creating: 'جاري إنشاء عملك...',
    footer: 'بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بـ Haady',
  },
};

export default function SetupForm() {
  const router = useRouter();
  const pathname = usePathname();
  const { setLoading } = useLoading();
  const { locale, isRTL } = useLocale();
  const { user } = useAuth();
  const t = translations[locale] || translations.en;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [isLoadingBusinessTypes, setIsLoadingBusinessTypes] = useState(true);

  // Create locale-aware schema
  const setupSchema = useMemo(() => createSetupSchema(locale), [locale]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    mode: 'onChange', // Validate on change to enable/disable button in real-time
    defaultValues: {
      businessName: '',
      country: '',
      businessType: '',
      fullName: '',
      mobilePhone: '',
    },
  });

  // Store setValue in a ref to ensure stable reference for useEffect
  const setValueRef = useRef(setValue);
  useEffect(() => {
    setValueRef.current = setValue;
  }, [setValue]);

  const country = watch('country');
  const selectedCountry = countries.find(c => c.id === country);
  const businessType = watch('businessType');
  const selectedBusinessType = businessTypes.find(bt => (bt.id || bt.value) === businessType);

  // Fetch countries from database directly using Supabase client
  useEffect(() => {
    const getUserSelectedCountry = async (): Promise<string | null> => {
      // 1. Try to get from URL pathname (e.g., /ar-ae/setup)
      const urlCountry = parseLocaleCountry(pathname);
      if (urlCountry?.country) {
        return urlCountry.country;
      }

      // 2. Try to get from cookies
      const cookieCountry = getLocaleCountryFromCookies();
      if (cookieCountry?.country) {
        return cookieCountry.country;
      }

      // 3. Try to get from user preferences in database (if logged in)
      const userId = user?.id;
      if (userId) {
        try {
          const { data, error } = await supabase
            .from('merchant_users')
            .select('preferred_country')
            .eq('auth_user_id', userId)
            .maybeSingle();

          if (!error && data?.preferred_country) {
            return data.preferred_country;
          }
        } catch (error) {
          console.error('Error loading user country preference:', error);
        }
      }

      return null;
    };

    const fetchCountries = async () => {
      try {
        console.log('Fetching countries from database...');
        
        // Gulf countries + Egypt ISO2 codes
        const GULF_COUNTRIES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG'];
        
        // Try 'countries' table first, fallback to 'countries_master'
        let { data: countriesData, error } = await supabase
          .from('countries')
          .select('id, name, name_ar, iso2, iso3, phone_code')
          .in('iso2', GULF_COUNTRIES)
          .order('name', { ascending: true });

        if (error) {
          console.log('Error with countries table, trying countries_master:', error.message);
          // If 'countries' table doesn't exist, try 'countries_master'
          const { data: countriesMaster, error: masterError } = await supabase
            .from('countries_master')
            .select('id, name, name_ar, iso2, iso3, phone_code')
            .in('iso2', GULF_COUNTRIES)
            .order('name', { ascending: true });

          if (masterError) {
            throw masterError;
          }
          
          countriesData = countriesMaster;
        }

        console.log('Countries fetched from DB:', countriesData?.length || 0);
        setCountries(countriesData || []);
        
        // Set default country based on user's selected country
        if (countriesData && countriesData.length > 0) {
          const userCountryCode = await getUserSelectedCountry();
          
          // Find country matching user's selection
          const defaultCountry = userCountryCode
            ? countriesData.find(c => c.iso2 === userCountryCode.toUpperCase())
            : null;
          
          // Fallback to Saudi Arabia if no user country found
          const countryToSet = defaultCountry || countriesData.find(c => c.iso2 === 'SA');
          
          if (countryToSet) {
            setValueRef.current('country', countryToSet.id, { shouldValidate: false });
          }
        }
      } catch (error: any) {
        console.error('Error fetching countries:', error);
        toast.error('Error', {
          description: error.message || 'Failed to load countries. Please refresh the page.',
          duration: 5000,
        });
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, [pathname, user?.id]);

  // Fetch business types from business_types table
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      try {
        console.log('Fetching business types from business_types table...');
        
        // Query business_types table with correct columns
        const { data: businessTypesData, error } = await supabase
          .from('business_types')
          .select('id, slug, name_en, name_ar, icon, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching business types:', error);
          toast.error('Error', {
            description: error.message || 'Failed to load business types.',
            duration: 5000,
          });
          setIsLoadingBusinessTypes(false);
          return;
        }

        console.log('Business types fetched:', businessTypesData?.length || 0, businessTypesData);
        
        if (businessTypesData && businessTypesData.length > 0) {
          // Map table data to expected structure
          const formatted = businessTypesData.map((item: any) => ({
            id: item.id,
            name: item.name_en, // Use English name for display
            value: item.slug || item.id, // Use slug as the value
            icon: item.icon,
            name_ar: item.name_ar // Keep Arabic name for potential future use
          }));
          console.log('Formatted business types:', formatted);
          setBusinessTypes(formatted);
        } else {
          console.warn('No business types found in table');
          setBusinessTypes([]);
        }
      } catch (error: any) {
        console.error('Unexpected error fetching business types:', error);
        toast.error('Error', {
          description: error?.message || 'Failed to load business types. Please refresh the page.',
          duration: 5000,
        });
      } finally {
        setIsLoadingBusinessTypes(false);
      }
    };

    fetchBusinessTypes();
  }, []);

  const onSubmit = async (values: SetupFormData) => {
    setIsSubmitting(true);
    setLoading(true, 'Creating your business account...');

    try {
      // Get country data from selected country (values.country stores the country ID)
      // Country is still used for phone number formatting
      const selectedCountryData = countries.find(c => c.id === values.country);
      if (!selectedCountryData) {
        throw new Error('Please select a valid country');
      }
      
      // Combine country code with phone number (remove any existing + from phone_code)
      const cleanPhoneCode = selectedCountryData.phone_code?.replace(/^\+/, '') || '';
      const fullPhoneNumber = cleanPhoneCode 
        ? `+${cleanPhoneCode}${values.mobilePhone}`
        : values.mobilePhone;

      // Validate all required parameters
      if (!values.businessName?.trim()) {
        throw new Error('Business name is required');
      }
      if (!values.businessType) {
        throw new Error('Business type is required');
      }
      if (!values.fullName?.trim()) {
        throw new Error('Full name is required');
      }
      if (!values.mobilePhone?.trim()) {
        throw new Error('Mobile phone is required');
      }

      // Get user IP address (client-side)
      let userIpAddress = '';
      try {
        // Try to get IP from a service (fallback to empty string)
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          userIpAddress = ipData.ip || '';
        }
      } catch (error) {
        console.warn('Could not fetch IP address:', error);
        // Continue with empty string - IP is optional
      }

      // Fetch latest terms version ID (optional - can be null if not required)
      let termVersionId: string | null = null;
      try {
        const { data: termsData, error: termsError } = await supabase
          .from('terms_versions')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!termsError && termsData?.id) {
          termVersionId = termsData.id;
        }
      } catch (error) {
        console.warn('Could not fetch terms version:', error);
        // Continue with null - terms version might be optional
      }

      // Get country and language from browser (pathname or cookies)
      // 1. Try to get from URL pathname (e.g., /ar-ae/setup)
      const urlCountry = parseLocaleCountry(pathname);
      let preferredCountry = urlCountry?.country || selectedCountryData.iso2;
      let preferredLanguage = urlCountry?.locale || locale;

      // 2. If not in URL, try to get from cookies
      if (!urlCountry) {
        const cookieCountry = getLocaleCountryFromCookies();
        if (cookieCountry) {
          preferredCountry = cookieCountry.country;
          preferredLanguage = cookieCountry.locale;
        }
      }

      // Ensure we have valid values (fallback to defaults)
      preferredCountry = preferredCountry || selectedCountryData.iso2 || 'AE';
      preferredLanguage = preferredLanguage || locale || 'en';

      // RPC function parameters (matches the actual function signature)
      // Store-related fields are set to null since store setup happens later
      const rpcParams = {
        user_full_name: values.fullName.trim(),
        user_phone: fullPhoneNumber,
        business_name: values.businessName.trim(),
        selected_business_type_id: values.businessType, // UUID from business_types table
        selected_category_id: null, // Category will be set up later when creating store
        store_name: null, // Store setup happens later
        store_city: null, // Store setup happens later
        store_lat: null, // Store setup happens later
        store_lng: null, // Store setup happens later
        store_address: null, // Store setup happens later
        term_version_id: termVersionId, // Latest terms version or null
        user_ip_address: userIpAddress || null, // User IP address or null
        preferred_country: preferredCountry, // Country code from browser (ISO2)
        preferred_language: preferredLanguage, // Language code from browser (en/ar)
      };

      console.log('Creating merchant account with:', rpcParams);
      console.log('RPC params validation:', {
        user_full_name: typeof rpcParams.user_full_name,
        user_phone: typeof rpcParams.user_phone,
        business_name: typeof rpcParams.business_name,
        selected_business_type_id: typeof rpcParams.selected_business_type_id,
        selected_category_id: rpcParams.selected_category_id,
        store_name: rpcParams.store_name,
        term_version_id: rpcParams.term_version_id,
        user_ip_address: rpcParams.user_ip_address,
      });

      // Call the RPC function to create merchant and store atomically
      const { data, error } = await supabase.rpc('create_merchant_onboarding', rpcParams);

      if (error) {
        // Log comprehensive error information
        console.error('RPC error object:', error);
        console.error('RPC error type:', typeof error);
        console.error('RPC error keys:', Object.keys(error || {}));
        console.error('RPC error stringified:', JSON.stringify(error, null, 2));
        console.error('RPC error toString:', String(error));
        
        // Extract error message from various possible formats
        const errorMessage = 
          error?.message || 
          error?.details || 
          error?.hint || 
          (typeof error === 'string' ? error : null) ||
          JSON.stringify(error) ||
          'Failed to create merchant account';
        
        console.error('Final error message:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('RPC response:', data);

      // Handle response - could be JSON object or direct result
      if (data && typeof data === 'object') {
        if ('success' in data && data.success === false) {
          throw new Error((data as { error?: string }).error || 'Failed to create business');
        }
        
        // If RPC returned success, trust it - the database transaction is atomic
        if ('success' in data && data.success === true) {
          console.log('Merchant created successfully:', data);
        }
      }

      toast.success('Welcome to Haady Business!', {
        description: 'Your business has been created successfully.',
        duration: 3000,
      });
      
      setLoading(true, 'Redirecting to dashboard...');
      
      // Wait a moment to ensure database transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get localized URL for dashboard
      const { getLocalizedUrl } = await import('@/lib/localized-url');
      const dashboardUrl = getLocalizedUrl('/dashboard', window.location.pathname);
      
      // Use window.location for a hard redirect to ensure fresh data
      window.location.href = dashboardUrl;
      
    } catch (err: any) {
      console.error('Error creating business:', err);
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Error stack:', err?.stack);
      
      // Extract error message from various possible formats
      const errorMessage = 
        err?.message || 
        err?.error?.message ||
        err?.details || 
        err?.hint || 
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        (err?.toString && err.toString() !== '[object Object]' ? err.toString() : null) ||
        'Failed to create business. Please try again.';
      
      console.error('Final error message for user:', errorMessage);
      
      toast.error('Error', {
        description: errorMessage,
        duration: 5000,
      });
      setLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              {t.title}
            </h1>
            <p className="text-base text-gray-600">
              {t.subtitle}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">
                {t.fullName}
              </Label>
              <Input
                id="fullName"
                {...register('fullName')}
                placeholder={t.fullNamePlaceholder}
                className={`h-12 ${errors.fullName ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={isSubmitting}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              {errors.fullName && (
                <p className="text-xs text-red-500">{errors.fullName.message}</p>
              )}
            </div>

            {/* Country and Mobile Phone - Horizontal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">
                  {t.country}
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`h-12 w-full justify-between border border-gray-300 rounded-md shadow-xs bg-transparent hover:bg-transparent focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px] ${errors.country ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500' : ''}`}
                      disabled={isSubmitting || isLoadingCountries}
                    >
                      <div className="flex items-center gap-2">
                        {isLoadingCountries ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                            <span className="text-gray-500">Loading countries...</span>
                          </>
                        ) : selectedCountry ? (
                          <>
                            <Flag countryName={selectedCountry.name} size="s" />
                            <span>{locale === 'ar' && selectedCountry.name_ar ? selectedCountry.name_ar : selectedCountry.name}</span>
                          </>
                        ) : (
                          <span className="text-gray-500">{t.selectCountry}</span>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-1 ml-2">
                    {countries.map((country) => (
                      <DropdownMenuItem
                        key={country.id}
                        onClick={() => setValue('country', country.id, { shouldValidate: true })}
                        className="cursor-pointer rounded-lg"
                      >
                        <Flag countryName={country.name} size="s" />
                        <span>{locale === 'ar' && country.name_ar ? country.name_ar : country.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {errors.country && (
                  <p className="text-xs text-red-500">{errors.country.message}</p>
                )}
              </div>

              {/* Mobile Phone */}
              <div className="space-y-2">
                <Label htmlFor="mobilePhone">
                  {t.mobilePhone}
                </Label>
                <div className="relative flex items-center">
                  <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} flex items-center pointer-events-none z-10`}>
                    <span className="text-gray-500 text-sm font-medium">
                      {selectedCountry?.phone_code 
                        ? `+${selectedCountry.phone_code.replace(/^\+/, '')}` 
                        : '+'}
                    </span>
                  </div>
                  <Input
                    id="mobilePhone"
                    {...register('mobilePhone')}
                    placeholder="1234567890"
                    type="tel"
                    className={`h-12 ${isRTL ? 'pr-16 text-right' : 'pl-16 text-left'} ${errors.mobilePhone ? 'border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '');
                      setValue('mobilePhone', value, { shouldValidate: true });
                    }}
                  />
                </div>
                {errors.mobilePhone && (
                  <p className="text-xs text-red-500">{errors.mobilePhone.message}</p>
                )}
              </div>
            </div>

            {/* Business Name and Business Type - Horizontal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName">
                  {t.businessName}
                </Label>
                <Input
                  id="businessName"
                  {...register('businessName')}
                  placeholder={t.businessNamePlaceholder}
                  className={`h-12 ${errors.businessName ? 'border-red-500 focus:ring-red-500' : ''}`}
                  disabled={isSubmitting}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                {errors.businessName && (
                  <p className="text-xs text-red-500">{errors.businessName.message}</p>
                )}
              </div>

              {/* Business Type */}
              <div className="space-y-2">
                <Label htmlFor="businessType">
                  {t.businessType}
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`h-12 w-full justify-between border border-gray-300 rounded-md shadow-xs bg-transparent hover:bg-transparent focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px] ${errors.businessType ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500' : ''}`}
                      disabled={isSubmitting || isLoadingBusinessTypes}
                    >
                      <div className="flex items-center gap-2">
                        {isLoadingBusinessTypes ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                            <span className="text-gray-500">Loading...</span>
                          </>
                        ) : selectedBusinessType ? (
                          <>
                            {selectedBusinessType.icon && <span className="text-lg">{selectedBusinessType.icon}</span>}
                            <span>{locale === 'ar' && selectedBusinessType.name_ar ? selectedBusinessType.name_ar : selectedBusinessType.name}</span>
                          </>
                        ) : (
                          <span className="text-gray-500">{t.selectBusinessType}</span>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-1 ml-2">
                    {businessTypes.length > 0 ? (
                      businessTypes.map((type) => (
                        <DropdownMenuItem
                          key={type.id || type.value || type.name}
                          onClick={() => setValue('businessType', type.id || type.value || type.name || '', { shouldValidate: true })}
                          className="cursor-pointer rounded-lg"
                        >
                          {type.icon && <span className="text-lg">{type.icon}</span>}
                          <span>{locale === 'ar' && type.name_ar ? type.name_ar : type.name}</span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled className="text-muted-foreground rounded-lg">
                        No business types available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {errors.businessType && (
                  <p className="text-xs text-red-500">{errors.businessType.message}</p>
                )}
              </div>
            </div>



            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t.creating}
                </>
              ) : (
                t.createBusiness
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          {t.footer}
        </p>
      </main>
    </div>
  );
}
