'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
    storeName: {
      min: 'Store name must be at least 3 characters',
      max: 'Store name must be at most 100 characters',
      regex: 'Store name can only contain letters, numbers, spaces, and common punctuation',
      spaces: 'Store name cannot start or end with spaces',
      consecutiveSpaces: 'Store name cannot contain multiple consecutive spaces',
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
    storeName: {
      min: 'يجب أن يكون اسم المتجر على الأقل 3 أحرف',
      max: 'يجب ألا يتجاوز اسم المتجر 100 حرف',
      regex: 'يمكن أن يحتوي اسم المتجر فقط على الأحرف والأرقام والمسافات وعلامات الترقيم الشائعة',
      spaces: 'لا يمكن أن يبدأ اسم المتجر أو ينتهي بمسافات',
      consecutiveSpaces: 'لا يمكن أن يحتوي اسم المتجر على مسافات متتالية متعددة',
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
    storeName: z
      .string()
      .min(3, errors.storeName.min)
      .max(100, errors.storeName.max)
      .regex(
        /^[a-zA-Z0-9\u0600-\u06FF\s&.,'-]+$/,
        errors.storeName.regex
      )
      .refine(
        (val) => !/^\s|\s$/.test(val),
        errors.storeName.spaces
      )
      .refine(
        (val) => !/\s{2,}/.test(val),
        errors.storeName.consecutiveSpaces
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
    storeName: 'Store Name',
    storeNamePlaceholder: 'Main Store',
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
    storeName: 'اسم المتجر',
    storeNamePlaceholder: 'المتجر الرئيسي',
    createBusiness: 'إنشاء العمل',
    creating: 'جاري إنشاء عملك...',
    footer: 'بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بـ Haady',
  },
};

export default function SetupForm() {
  const router = useRouter();
  const { setLoading } = useLoading();
  const { locale, isRTL } = useLocale();
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
      storeName: '',
      country: '',
      businessType: '',
      fullName: '',
      mobilePhone: '',
    },
  });

  const country = watch('country');
  const selectedCountry = countries.find(c => c.id === country);
  const businessType = watch('businessType');
  const selectedBusinessType = businessTypes.find(bt => (bt.id || bt.value) === businessType);
  const storeName = watch('storeName');

  // Generate slug from store name
  const generateSlug = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
      .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  // Debounced slug state
  const [debouncedSlug, setDebouncedSlug] = useState('');
  const [isSlugLoading, setIsSlugLoading] = useState(false);

  // Debounce slug generation - only generate if input is valid
  useEffect(() => {
    if (!storeName || storeName.trim() === '') {
      setDebouncedSlug('');
      setIsSlugLoading(false);
      return;
    }

    // Check if storeName meets validation requirements
    const trimmedName = storeName.trim();
    const hasError = !!errors.storeName;
    const meetsMinLength = trimmedName.length >= 3;

    // Don't generate slug if validation fails
    if (hasError || !meetsMinLength) {
      setDebouncedSlug('');
      setIsSlugLoading(false);
      return;
    }

    setIsSlugLoading(true);
    const timer = setTimeout(() => {
      const slug = generateSlug(storeName);
      setDebouncedSlug(slug);
      setIsSlugLoading(false);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timer);
    };
  }, [storeName, !!errors.storeName]);

  // Fetch countries from database directly using Supabase client
  useEffect(() => {
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
        
        // Set Saudi Arabia as default country
        if (countriesData && countriesData.length > 0) {
          const saudiArabia = countriesData.find(c => c.iso2 === 'SA');
          if (saudiArabia) {
            setValue('country', saudiArabia.id, { shouldValidate: false });
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
  }, [setValue]);

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
      const selectedCountryData = countries.find(c => c.id === values.country);
      if (!selectedCountryData) {
        throw new Error('Please select a valid country');
      }
      
      // Combine country code with phone number (remove any existing + from phone_code)
      const cleanPhoneCode = selectedCountryData.phone_code?.replace(/^\+/, '') || '';
      const fullPhoneNumber = cleanPhoneCode 
        ? `+${cleanPhoneCode}${values.mobilePhone}`
        : values.mobilePhone;

      // RPC function parameters (matches the function signature)
      const rpcParams = {
        business_name: values.businessName,
        store_name: values.storeName,
        selected_country_id: selectedCountryData.id,
        selected_business_type_id: values.businessType, // UUID from business_types table
        user_full_name: values.fullName,
        user_phone: fullPhoneNumber,
      };

      console.log('Creating merchant account with:', rpcParams);

      // Call the RPC function to create merchant and store atomically
      const { data, error } = await supabase.rpc('create_merchant_onboarding', rpcParams);

      if (error) {
        console.error('RPC error:', error);
        console.error('RPC error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2),
        });
        throw new Error(error.message || error.details || error.hint || 'Failed to create merchant account');
      }

      console.log('RPC response:', data);

      // Handle response - could be JSON object or direct result
      if (data && typeof data === 'object') {
        if ('success' in data && data.success === false) {
          throw new Error((data as { error?: string }).error || 'Failed to create business');
        }
      }

      toast.success('Welcome to Haady Business!', {
        description: 'Your business has been created successfully.',
        duration: 5000,
      });
      
      setLoading(true, 'Redirecting to dashboard...');
      router.push('/dashboard');
      router.refresh();
      
    } catch (err: any) {
      console.error('Error creating business:', err);
      toast.error('Error', {
        description: err.message || 'Failed to create business. Please try again.',
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
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {countries.map((country) => (
                      <DropdownMenuItem
                        key={country.id}
                        onClick={() => setValue('country', country.id, { shouldValidate: true })}
                        className="cursor-pointer"
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
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {businessTypes.length > 0 ? (
                      businessTypes.map((type) => (
                        <DropdownMenuItem
                          key={type.id || type.value || type.name}
                          onClick={() => setValue('businessType', type.id || type.value || type.name || '', { shouldValidate: true })}
                          className="cursor-pointer"
                        >
                          {type.icon && <span className="text-lg">{type.icon}</span>}
                          <span>{locale === 'ar' && type.name_ar ? type.name_ar : type.name}</span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled className="text-muted-foreground">
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

            {/* Store Name */}
            <div className="space-y-2">
              <Label htmlFor="storeName">
                {t.storeName}
              </Label>
              <Input
                id="storeName"
                {...register('storeName')}
                placeholder={t.storeNamePlaceholder}
                className={`h-12 ${errors.storeName ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={isSubmitting}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              {(isSlugLoading || debouncedSlug) && (
                <div className={`flex items-center gap-2 ${isRTL ? 'mr-1' : 'ml-1'}`}>
                  {isSlugLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                  ) : (
                    debouncedSlug && (
                      <p className="text-xs text-gray-500 font-medium">
                        {debouncedSlug}
                      </p>
                    )
                  )}
                </div>
              )}
              {errors.storeName && (
                <p className="text-xs text-red-500">{errors.storeName.message}</p>
              )}
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
