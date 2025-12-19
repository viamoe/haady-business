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
import { Loader2, ChevronDown } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useLoading } from '@/lib/loading-context'
import { Flag } from '@/components/flag'
import { useLocale } from '@/i18n/context'
import { parseLocaleCountry, getLocaleCountryFromCookies } from '@/lib/localized-url'
import { useAuth } from '@/lib/auth/auth-context'
import { FormStateCookies } from '@/lib/cookies'
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

// Error messages translations
const errorMessages = {
  en: {
    fullName: {
      min: 'Full name must be at least 2 names',
      max: 'Full name must be at most 100 characters',
      regex: 'Full name can only contain letters, spaces, hyphens, and apostrophes',
      fullName: 'Please enter your full name (first and last name)',
      spaces: 'Full name cannot start or end with spaces',
    },
    email: {
      required: 'Email is required',
      invalid: 'Please enter a valid email address',
    },
    country: {
      required: 'Please select a country',
    },
    mobilePhone: {
      min: 'Mobile phone must be at least 8 characters',
      max: 'Mobile phone must be at most 20 characters',
      regex: 'Please enter a valid phone number',
    },
    role: {
      required: 'Your role is required',
    },
  },
  ar: {
    fullName: {
      min: 'يجب أن يكون الاسم الكامل على الأقل اسمين',
      max: 'يجب ألا يتجاوز الاسم الكامل 100 حرف',
      regex: 'يمكن أن يحتوي الاسم الكامل فقط على الأحرف والمسافات والشرطات والفواصل العليا',
      fullName: 'الرجاء إدخال اسمك الكامل (الاسم الأول والأخير)',
      spaces: 'لا يمكن أن يبدأ الاسم الكامل أو ينتهي بمسافات',
    },
    email: {
      required: 'البريد الإلكتروني مطلوب',
      invalid: 'الرجاء إدخال عنوان بريد إلكتروني صحيح',
    },
    country: {
      required: 'الرجاء اختيار بلد',
    },
    mobilePhone: {
      min: 'يجب أن يكون رقم الجوال على الأقل 8 أحرف',
      max: 'يجب ألا يتجاوز رقم الجوال 20 حرف',
      regex: 'الرجاء إدخال رقم هاتف صحيح',
    },
    role: {
      required: 'دورك مطلوب',
    },
  },
}

// Create schema with locale-aware error messages
const createPersonalDetailsSchema = (locale: 'en' | 'ar' = 'en') => {
  const errors = errorMessages[locale]
  
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
    email: z
      .string()
      .min(1, errors.email.required)
      .email(errors.email.invalid),
    country: z
      .string()
      .min(1, errors.country.required),
    mobilePhone: z
      .string()
      .min(8, errors.mobilePhone.min)
      .max(20, errors.mobilePhone.max)
      .regex(/^[+]?[\d\s\-()]+$/, errors.mobilePhone.regex),
    role: z
      .string()
      .min(1, errors.role?.required || 'Role is required'),
  })
}

type PersonalDetailsFormData = z.infer<ReturnType<typeof createPersonalDetailsSchema>>

// Translations
const translations = {
  en: {
    title: 'Personal Details',
    subtitle: 'Tell us about yourself to get started',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Your full name',
    email: 'Email',
    emailPlaceholder: 'your.email@example.com',
    country: 'Country',
    selectCountry: 'Select your country',
    mobilePhone: 'Mobile Phone',
    role: 'Your role',
    selectRole: 'Select your role',
    continue: 'Continue',
    saving: 'Saving your details...',
  },
  ar: {
    title: 'البيانات الشخصية',
    subtitle: 'أخبرنا عن نفسك للبدء',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'اسمك الكامل',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'your.email@example.com',
    country: 'البلد',
    selectCountry: 'اختر بلدك',
    mobilePhone: 'رقم الجوال',
    role: 'دورك',
    selectRole: 'اختر دورك',
    continue: 'متابعة',
    saving: 'جاري حفظ بياناتك...',
  },
}

export function PersonalDetailsStep({ onNext }: OnboardingStepProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { setLoading } = useLoading()
  const { locale, isRTL } = useLocale()
  const { user } = useAuth()
  const t = translations[locale] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isRoleOpen, setIsRoleOpen] = useState(false)
  const [roleOptions, setRoleOptions] = useState<Array<{ value: string; label: { en: string; ar: string } }>>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  
  // Role label mappings (since enum only has values)
  const roleLabelMap: Record<string, { en: string; ar: string }> = {
    owner: { en: 'Owner', ar: 'مالك' },
    manager: { en: 'Manager', ar: 'مدير' },
    employee: { en: 'Employee', ar: 'موظف' },
    admin: { en: 'Administrator', ar: 'مسؤول' },
    staff: { en: 'Staff', ar: 'موظف' },
    other: { en: 'Other', ar: 'أخرى' },
  }

  // Create locale-aware schema
  const personalDetailsSchema = useMemo(() => createPersonalDetailsSchema(locale), [locale])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting: formIsSubmitting },
    setValue,
    watch,
  } = useForm<PersonalDetailsFormData>({
    resolver: zodResolver(personalDetailsSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: {
      fullName: '',
      email: '',
      country: '',
      mobilePhone: '',
      role: '',
    },
  })

  const setValueRef = useRef(setValue)
  useEffect(() => {
    setValueRef.current = setValue
  }, [setValue])

  const country = watch('country')
  const selectedCountry = countries.find(c => c.id === country)
  const email = watch('email')
  const mobilePhone = watch('mobilePhone')
  const role = watch('role')
  const selectedRole = roleOptions.find(r => r.value === role)

  // Load user data if available
  useEffect(() => {
    if (user?.email) {
      setValue('email', user.email, { shouldValidate: false })
    }
    if (user?.user_metadata?.full_name) {
      setValue('fullName', user.user_metadata.full_name, { shouldValidate: false })
    }
  }, [user, setValue])

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
            const userCountryCode = await getUserSelectedCountry()
            const defaultCountry = userCountryCode
              ? validCountries.find((c: Country) => c.iso2 === userCountryCode.toUpperCase())
              : null
            
            const countryToSet = defaultCountry || 
                                validCountries.find((c: Country) => c.iso2 === 'SA') || 
                                validCountries[0]
            
            if (countryToSet) {
              setValueRef.current('country', countryToSet.id, { shouldValidate: false })
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
  }, [pathname])

  // Fetch business role enum values
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setIsLoadingRoles(true)
        const response = await fetch('/api/business-roles', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })
        
        // Always try to parse the response, even if status is not ok
        let responseData: any = {}
        try {
          responseData = await response.json()
        } catch (parseError) {
          console.warn('Failed to parse response:', parseError)
        }
        
        // If response is ok, use the data
        if (response.ok && responseData.roles) {
          const rolesData = responseData.roles || []
          
          if (rolesData && rolesData.length > 0) {
            // Map enum values to options with labels
            const mappedRoles = rolesData.map((roleValue: { value: string } | string) => {
              const value = typeof roleValue === 'string' ? roleValue : roleValue.value
              return {
                value,
                label: roleLabelMap[value] || { en: value, ar: value },
              }
            })
            setRoleOptions(mappedRoles)
          } else {
            // Use fallback if no roles returned
            setRoleOptions([
              { value: 'owner', label: { en: 'Owner', ar: 'مالك' } },
              { value: 'manager', label: { en: 'Manager', ar: 'مدير' } },
              { value: 'employee', label: { en: 'Employee', ar: 'موظف' } },
            ])
          }
        } else {
          // Response not ok, use fallback
          console.warn('API returned non-ok status, using fallback roles')
          setRoleOptions([
            { value: 'owner', label: { en: 'Owner', ar: 'مالك' } },
            { value: 'manager', label: { en: 'Manager', ar: 'مدير' } },
            { value: 'employee', label: { en: 'Employee', ar: 'موظف' } },
            { value: 'admin', label: { en: 'Administrator', ar: 'مسؤول' } },
            { value: 'staff', label: { en: 'Staff', ar: 'موظف' } },
          ])
        }
      } catch (error: any) {
        console.error('Error fetching roles:', error)
        // Fallback to default roles if API fails
        setRoleOptions([
          { value: 'owner', label: { en: 'Owner', ar: 'مالك' } },
          { value: 'manager', label: { en: 'Manager', ar: 'مدير' } },
          { value: 'employee', label: { en: 'Employee', ar: 'موظف' } },
          { value: 'admin', label: { en: 'Administrator', ar: 'مسؤول' } },
          { value: 'staff', label: { en: 'Staff', ar: 'موظف' } },
        ])
      } finally {
        setIsLoadingRoles(false)
      }
    }

    fetchRoles()
  }, [])

  const onSubmit = async (values: PersonalDetailsFormData) => {
    setIsSubmitting(true)

    try {
      const selectedCountryData = countries.find(c => c.id === values.country)
      if (!selectedCountryData) {
        throw new Error('Please select a valid country')
      }
      
      const cleanPhoneCode = selectedCountryData.phone_code?.replace(/^\+/, '') || ''
      const fullPhoneNumber = cleanPhoneCode 
        ? `+${cleanPhoneCode}${values.mobilePhone}`
        : values.mobilePhone

      if (!values.fullName?.trim()) {
        throw new Error('Full name is required')
      }
      if (!values.email?.trim()) {
        throw new Error('Email is required')
      }
      if (!values.mobilePhone?.trim()) {
        throw new Error('Mobile phone is required')
      }

      // Save personal details to cookies for the next step (BusinessSetupStep)
      FormStateCookies.saveLastFormData('personal_details', {
        fullName: values.fullName,
        email: values.email,
        countryId: selectedCountryData.id,
        countryIso2: selectedCountryData.iso2,
        mobilePhone: fullPhoneNumber,
      })

      // Proceed to the next step
      await onNext()
      
    } catch (err: any) {
      console.error('Error saving personal details:', err)
      
      const errorMessage = 
        err?.message || 
        err?.error?.message ||
        err?.details || 
        err?.hint || 
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        (err?.toString && err.toString() !== '[object Object]' ? err.toString() : null) ||
        'Failed to save personal details. Please try again.'
      
      toast.error('Error', {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
      {/* Full Name */}
      <div className="space-y-2 w-full">
        <Label htmlFor="fullName" className={focusedField === 'fullName' ? 'text-[#F4610B]' : ''}>
          {t.fullName}
        </Label>
        <Input
          id="fullName"
          {...register('fullName')}
          placeholder={t.fullNamePlaceholder}
          className={`h-12 w-full hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${errors.fullName ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : '!border-gray-300'}`}
          disabled={isSubmitting}
          dir={isRTL ? 'rtl' : 'ltr'}
          onFocus={() => setFocusedField('fullName')}
          onBlur={() => setFocusedField(null)}
        />
        {errors.fullName && (
          <p className="text-xs text-red-500">{errors.fullName.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2 w-full">
        <Label htmlFor="email">{t.email}</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder={t.emailPlaceholder}
          className={`h-12 w-full hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${errors.email ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : '!border-gray-300'}`}
          disabled={isSubmitting || !!user?.email}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Your Role */}
      <div className="space-y-2 w-full">
        <Label htmlFor="role" className={isRoleOpen ? 'text-[#F4610B]' : ''}>
          {t.role}
        </Label>
        <DropdownMenu open={isRoleOpen} onOpenChange={setIsRoleOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`h-12 w-full justify-between rounded-md shadow-xs bg-transparent hover:bg-transparent border-[1px] hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isRoleOpen ? '!border-orange-500 !ring-1 !ring-orange-500' : ''} ${errors.role ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : isRoleOpen ? '' : '!border-gray-300'}`}
              disabled={isSubmitting || isLoadingRoles}
            >
              {isLoadingRoles ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-gray-500">Loading roles...</span>
                </>
              ) : (
                <span className={selectedRole ? 'text-gray-700' : 'text-gray-500'}>
                  {selectedRole 
                    ? (locale === 'ar' ? selectedRole.label.ar : selectedRole.label.en)
                    : t.selectRole}
                </span>
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl overflow-hidden p-1 max-h-[300px] overflow-y-auto" align={isRTL ? 'end' : 'start'}>
            {isLoadingRoles ? (
              <DropdownMenuItem disabled>
                <span className="text-gray-500">Loading roles...</span>
              </DropdownMenuItem>
            ) : roleOptions.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className="text-gray-500">No roles available</span>
              </DropdownMenuItem>
            ) : (
              roleOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  setValue('role', option.value, { shouldValidate: true })
                }}
                className={`cursor-pointer rounded-lg h-10 mb-1 hover:!bg-orange-50 focus:!bg-orange-50 ${isRTL ? 'text-right' : ''} ${role === option.value ? '!bg-orange-100' : ''}`}
              >
                <span className={isRTL ? 'text-right w-full' : ''}>
                  {locale === 'ar' ? option.label.ar : option.label.en}
                </span>
              </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {errors.role && (
          <p className="text-xs text-red-500">{errors.role.message}</p>
        )}
      </div>

      {/* Country and Mobile Phone */}
      <div className="space-y-6 w-full">
        {/* Country */}
        <div className="space-y-2 w-full">
          <Label htmlFor="country" className={isCountryOpen ? 'text-[#F4610B]' : ''}>
            {t.country}
          </Label>
          <DropdownMenu open={isCountryOpen} onOpenChange={setIsCountryOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={`h-12 w-full justify-between rounded-md shadow-xs bg-transparent hover:bg-transparent border-[1px] hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isCountryOpen ? '!border-orange-500 !ring-1 !ring-orange-500' : ''} ${errors.country ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : isCountryOpen ? '' : '!border-gray-300'}`}
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
                      <Flag countryName={selectedCountry.name} flagUrl={selectedCountry.flag_url} size="s" />
                      <span>{locale === 'ar' && selectedCountry.name_ar ? selectedCountry.name_ar : selectedCountry.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">{t.selectCountry}</span>
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
                  const isSelected = country.id === selectedCountry?.id
                  return (
                    <DropdownMenuItem
                      key={country.id}
                      onClick={() => {
                        setValue('country', country.id, { shouldValidate: true })
                      }}
                      className={`cursor-pointer rounded-lg h-10 mb-1 ${isRTL ? 'flex-row-reverse' : ''} ${isSelected ? '!bg-orange-100' : 'hover:!bg-orange-50 focus:!bg-orange-50'}`}
                    >
                      <Flag countryName={country.name} flagUrl={country.flag_url} size="s" rounded={false} />
                      <span className={isRTL ? 'text-right flex-1' : ''}>{locale === 'ar' && country.name_ar ? country.name_ar : country.name}</span>
                    </DropdownMenuItem>
                  )
                }).filter(Boolean)
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {errors.country && (
            <p className="text-xs text-red-500">{errors.country.message}</p>
          )}
        </div>

        {/* Mobile Phone */}
        <div className="space-y-2 w-full">
          <Label htmlFor="mobilePhone">{t.mobilePhone}</Label>
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
            className={`h-12 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500 ${isRTL ? 'pr-16 text-right' : 'pl-16 text-left'} ${errors.mobilePhone ? '!border-red-500 focus-visible:!ring-red-500 focus-visible:!border-red-500' : '!border-gray-300'}`}
            disabled={isSubmitting}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              setValue('mobilePhone', value, { shouldValidate: true })
            }}
          />
          </div>
          {errors.mobilePhone && (
            <p className="text-xs text-red-500">{errors.mobilePhone.message}</p>
          )}
        </div>
      </div>

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
              {t.saving}
            </>
          ) : (
            t.continue
          )}
        </Button>
      </div>
    </form>
  )
}

