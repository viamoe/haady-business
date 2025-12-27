'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { parseLocaleCountry, getLocaleCountryFromCookies, getDefaultLocaleCountry, getLocalizedUrl } from '@/lib/localized-url';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useLoading } from '@/lib/loading-context';
import { debounce, DEBOUNCE_DELAYS } from '@/lib/utils/debounce';
import { OtpInput, type OtpInputRef } from '@/components/auth/OtpInput';
import { handleError, isNetworkError, isAuthError } from '@/lib/utils/error-handling';

const SUPABASE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets';
const PRODUCTS_STORAGE_URL = `${SUPABASE_STORAGE_URL}/haady/gifts`;
const ECOMMERCE_STORAGE_URL = `${SUPABASE_STORAGE_URL}/ecommerce`;

// E-commerce platform logos
const ecommerceLogos = [
  { name: 'salla-logo', alt: 'Salla' },
  { name: 'shopify-logo', alt: 'Shopify' },
  { name: 'woow-logo', alt: 'Woow' },
  { name: 'zid-logo', alt: 'Zid' },
];

// Decorative product images with specific positioning and rotation
const decorativeProducts = [
  { 
    name: 'sneaker', 
    alt: 'Athletic Sneaker',
    position: 'top-[12%] left-[25%] md:left-[15%] lg:left-[10%] xl:left-[20%] 2xl:left-[25%]',
    size: { width: 200, height: 200 },
    rotate: 'rotate-[-15deg]',
    rotationDegrees: -15,
    delay: 0.1
  },
  { 
    name: 'watch', 
    alt: 'Chronograph Watch',
    position: 'top-[17%] right-[25%] md:right-[15%] lg:right-[10%] xl:right-[20%] 2xl:right-[25%]',
    size: { width: 150, height: 150 },
    rotate: 'rotate-[-10deg]',
    rotationDegrees: -10,
    delay: 0.2
  },
  { 
    name: 'lipstick', 
    alt: 'Lipstick',
    position: 'top-[40%] left-[20%] md:left-[12%] lg:left-[6%] xl:left-[15%] 2xl:left-[20%]',
    size: { width: 150, height: 150 },
    rotate: 'rotate-[-5deg]',
    rotationDegrees: -5,
    delay: 0.3
  },
  { 
    name: 'perfume', 
    alt: 'Perfume Bottle',
    position: 'top-[40%] right-[20%] md:right-[12%] lg:right-[6%] xl:right-[15%] 2xl:right-[20%]',
    size: { width: 150, height: 150 },
    rotate: 'rotate-[5deg]',
    rotationDegrees: 5,
    delay: 0.4
  },
  { 
    name: 'coffee-machine', 
    alt: 'Coffee Machine',
    position: 'bottom-[20%] left-[25%] md:left-[15%] lg:left-[8%] xl:left-[20%] 2xl:left-[25%]',
    size: { width: 150, height: 150 },
    rotate: 'rotate-[15deg]',
    rotationDegrees: 15,
    delay: 0.5
  },
  { 
    name: 'headphones', 
    alt: 'Headphones',
    position: 'bottom-[20%] right-[25%] md:right-[15%] lg:right-[8%] xl:right-[20%] 2xl:right-[25%]',
    size: { width: 170, height: 170 },
    rotate: 'rotate-[8deg]',
    rotationDegrees: 8,
    delay: 0.6
  },
];

interface AuthFormProps {
  mode: 'login' | 'signup';
  reason?: string;
}

export default function AuthForm({ mode, reason }: AuthFormProps) {
  const t = useTranslations();
  const { locale, isRTL, dir } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setLoading } = useLoading();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailCheckStatus, setEmailCheckStatus] = useState<{
    exists: boolean | null;
    isMerchant: boolean | null;
    shouldLogin: boolean;
    shouldSignup: boolean;
    message?: string;
  } | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpInputRef = useRef<OtpInputRef>(null);
  const isVerifyingRef = useRef(false); // Ref-based guard for verification

  const isSignupMode = mode === 'signup';

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Check if email exists in the system
  const checkEmailExists = useCallback(async (emailToCheck: string) => {
    if (!validateEmail(emailToCheck)) {
      setEmailCheckStatus(null);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmailCheckStatus(data);
        // Track if account is not found (for login mode)
        if (!isSignupMode && data.shouldSignup && !data.exists) {
          setAccountNotFound(true);
        } else {
          setAccountNotFound(false);
        }
      } else {
        setEmailCheckStatus(null);
        setAccountNotFound(false);
      }
    } catch (error) {
      // Use standardized error handling
      handleError(error, 'EmailCheck');
      setEmailCheckStatus(null);
    } finally {
      setIsCheckingEmail(false);
    }
  }, [isSignupMode]);

  // Create debounced version of email check using utility
  const debouncedCheckEmail = useMemo(
    () => debounce((emailToCheck: string) => {
      checkEmailExists(emailToCheck);
    }, DEBOUNCE_DELAYS.EMAIL_CHECK),
    [checkEmailExists]
  );

  // Debounced email check - only check after user stops typing
  useEffect(() => {
    if (!email || !validateEmail(email)) {
      setEmailCheckStatus(null);
      setAccountNotFound(false);
      return;
    }

    debouncedCheckEmail(email);
  }, [email, debouncedCheckEmail]);

  // Reset accountNotFound when email changes
  useEffect(() => {
    setAccountNotFound(false);
  }, [email]);

  // Clean up OTP state from URL and localStorage
  const cleanupOtpState = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('step');
    window.history.replaceState({}, '', url.toString());
    
    localStorage.removeItem('otp_email');
    localStorage.removeItem('otp_signup_mode');
    localStorage.removeItem('otp_timer_end');
    
    setResendTimer(0);
    setCanResend(false);
    // Reset verification ref to allow future verification attempts
    isVerifyingRef.current = false;
    setIsVerifying(false);
  };

  // Pre-fill email from query params if available
  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
      const url = new URL(window.location.href);
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Restore OTP state from URL parameter (refresh-friendly)
  useEffect(() => {
    const stepParam = searchParams?.get('step');
    if (stepParam === 'otp') {
      const emailFromStorage = localStorage.getItem('otp_email');
      const timerEndTime = localStorage.getItem('otp_timer_end');
      
      if (emailFromStorage) {
        setEmail(emailFromStorage);
        setOtpSent(true);
        setShowOtp(true);
        
        if (timerEndTime) {
          const endTime = parseInt(timerEndTime, 10);
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          if (remaining > 0) {
            setResendTimer(remaining);
            setCanResend(false);
          } else {
            setResendTimer(0);
            setCanResend(true);
          }
        }
      }
    }
  }, [searchParams]);

  // Timer countdown effect
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            localStorage.removeItem('otp_timer_end');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Clean up logout param from URL after showing message
  useEffect(() => {
    if (reason === 'account_deleted') {
      const timer = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('logout');
        window.history.replaceState({}, '', url.toString());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [reason]);

  // Auto-focus OTP input when shown
  useEffect(() => {
    if (showOtp) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [showOtp]);

  // Handle OTP completion (all digits filled)
  const handleOtpComplete = (otpCode: string) => {
    if (otpCode.length === 6) {
      handleVerifyOtp(otpCode);
    }
  };

  // Handle successful auth - redirect to onboarding with email
  // This catches the SIGNED_IN event that fires when OTP verification succeeds
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && isVerifyingRef.current) {
        cleanupOtpState();
        
        // Pass email to onboarding personal-details for pre-filling the form
        const localizedPath = getLocalizedUrl('/onboarding/personal-details', pathname);
        const onboardingUrl = new URL(localizedPath, window.location.origin);
        if (email) {
          onboardingUrl.searchParams.set('email', email.trim().toLowerCase());
        }
        window.location.href = onboardingUrl.toString();
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, email]);

  const handleVerifyOtp = async (otpCode: string) => {
    if (otpCode.length !== 6) return;
    if (isVerifyingRef.current) {
      return;
    }

    isVerifyingRef.current = true;
    setIsVerifying(true);
    setOtpError('');

    try {
      // Verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode,
        type: 'email',
      });

      if (error) {
        const errorMessage = error.message || t('auth.verificationFailed');
        const lowerErrorMessage = errorMessage.toLowerCase();
        
        // Handle "signups not allowed" error (user doesn't exist in login mode)
        if (isAuthError(error) && (lowerErrorMessage.includes('signups not allowed') || lowerErrorMessage.includes('signup not allowed'))) {
          setShowOtp(false);
          setOtpSent(false);
          setOtp(['', '', '', '', '', '']);
          setAccountNotFound(true);
          cleanupOtpState();
        } else {
          // Handle other errors (expired, invalid, etc.)
          const displayError = lowerErrorMessage.includes('expired') || lowerErrorMessage.includes('invalid')
            ? t('auth.codeExpired')
            : errorMessage;
          
          setOtpError(displayError);
          toast.error(t('auth.verificationFailed'), { description: displayError });
          setOtp(['', '', '', '', '', '']);
          otpInputRef.current?.focus();
        }
        
        isVerifyingRef.current = false;
        setIsVerifying(false);
        return;
      }
      
      // Success - redirect to onboarding
      if (data?.session) {
        cleanupOtpState();
        
        // Pass email to onboarding personal-details for pre-filling the form
        const localizedPath = getLocalizedUrl('/onboarding/personal-details', pathname);
        const onboardingUrl = new URL(localizedPath, window.location.origin);
        if (email) {
          onboardingUrl.searchParams.set('email', email.trim().toLowerCase());
        }
        window.location.href = onboardingUrl.toString();
      }
    } catch (error: unknown) {
      // Network errors or unexpected errors - use standardized error handling
      const errorMessage = handleError(error, 'OTPVerification');
      setOtpError(isNetworkError(error) ? t('common.networkError') || 'Network error. Please check your connection.' : t('common.error'));
      toast.error(t('common.error'), {
        description: isNetworkError(error) ? t('common.networkError') || 'Network error. Please check your connection.' : errorMessage,
      });
      setOtp(['', '', '', '', '', '']);
      otpInputRef.current?.focus();
      isVerifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  // Actually start the OAuth flow (called directly or after redirect from haady.app)
  const startOAuthFlow = async (preferredCountry: string, preferredLanguage: string) => {
    const isLocalhost = window.location.hostname === 'localhost';
    const baseRedirectUrl = isLocalhost 
      ? 'http://localhost:3002/auth/callback'
      : `${window.location.origin}/auth/callback`;
    
    const redirectUrl = new URL(baseRedirectUrl);
    redirectUrl.searchParams.set('app_type', 'business');
    redirectUrl.searchParams.set('preferred_country', preferredCountry);
    redirectUrl.searchParams.set('preferred_language', preferredLanguage);
    
    console.log('🔵 Starting OAuth with redirect URL:', redirectUrl.toString());
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl.toString(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      toast.error(t('common.error'), {
        description: error.message || 'Failed to sign in with Google',
        duration: 5000,
      });
      setIsGoogleLoading(false);
    }
  };

  // Check if we're returning from cookie setup (for non-haady domains)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthReady = urlParams.get('oauth_ready');
    const country = urlParams.get('preferred_country');
    const language = urlParams.get('preferred_language');
    
    if (oauthReady === 'true' && country && language) {
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth_ready');
      url.searchParams.delete('preferred_country');
      url.searchParams.delete('preferred_language');
      window.history.replaceState({}, '', url.toString());
      
      // Start OAuth flow
      setIsGoogleLoading(true);
      startOAuthFlow(country, language);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      let preferredCountry = 'SA';
      let preferredLanguage = locale;
      
      const urlCountry = parseLocaleCountry(pathname);
      if (urlCountry) {
        preferredCountry = urlCountry.country;
        preferredLanguage = urlCountry.locale;
      } else {
        const cookieCountry = getLocaleCountryFromCookies();
        if (cookieCountry) {
          preferredCountry = cookieCountry.country;
          preferredLanguage = cookieCountry.locale;
        } else {
          const defaults = getDefaultLocaleCountry();
          preferredCountry = defaults.country;
          preferredLanguage = defaults.locale;
        }
      }
      
      const isLocalhost = window.location.hostname === 'localhost';
      const isHaadyDomain = window.location.hostname.endsWith('.haady.app') || window.location.hostname === 'haady.app';
      
      console.log('🔵 OAuth Configuration:');
      console.log('  Current origin:', window.location.origin);
      console.log('  Is Haady domain:', isHaadyDomain);
      console.log('  Is Localhost:', isLocalhost);
      
      if (isHaadyDomain || isLocalhost) {
        // On haady.app domain or localhost - can set cookie directly and start OAuth
        const cookieData = JSON.stringify({
          app_type: 'business',
          preferred_country: preferredCountry,
          preferred_language: preferredLanguage,
          origin: window.location.origin,
          timestamp: Date.now(),
        });
        
        if (isHaadyDomain) {
          document.cookie = `haady_oauth_origin=${encodeURIComponent(cookieData)}; path=/; max-age=600; SameSite=Lax; domain=.haady.app; Secure`;
        } else {
          document.cookie = `haady_oauth_origin=${encodeURIComponent(cookieData)}; path=/; max-age=600; SameSite=Lax`;
        }
        console.log('Set OAuth origin cookie directly');
        
        // Start OAuth directly
        await startOAuthFlow(preferredCountry, preferredLanguage);
      } else {
        // On Vercel preview or other non-haady domain
        // Redirect to haady.app to set the cookie, then come back to start OAuth
        const returnUrl = new URL(window.location.href);
        returnUrl.searchParams.set('oauth_ready', 'true');
        returnUrl.searchParams.set('preferred_country', preferredCountry);
        returnUrl.searchParams.set('preferred_language', preferredLanguage);
        
        const oauthStartUrl = new URL('https://haady.app/api/oauth-start');
        oauthStartUrl.searchParams.set('origin', window.location.origin);
        oauthStartUrl.searchParams.set('app_type', 'business');
        oauthStartUrl.searchParams.set('preferred_country', preferredCountry);
        oauthStartUrl.searchParams.set('preferred_language', preferredLanguage);
        oauthStartUrl.searchParams.set('return_url', returnUrl.toString());
        
        console.log('🔵 Redirecting to haady.app to set cookie:', oauthStartUrl.toString());
        
        // Redirect to haady.app to set the cookie
        window.location.href = oauthStartUrl.toString();
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      toast.error(t('common.error'), {
        description: t('auth.googleSignInError'),
        duration: 5000,
      });
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (!validateEmail(email)) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }

    setIsLoading(true);
    
    try {
      let preferredCountry = 'SA';
      let preferredLanguage = locale;
      
      if (isSignupMode) {
        const urlCountry = parseLocaleCountry(pathname);
        if (urlCountry) {
          preferredCountry = urlCountry.country;
          preferredLanguage = urlCountry.locale;
        } else {
          const cookieCountry = getLocaleCountryFromCookies();
          if (cookieCountry) {
            preferredCountry = cookieCountry.country;
            preferredLanguage = cookieCountry.locale;
          } else {
            const defaults = getDefaultLocaleCountry();
            preferredCountry = defaults.country;
            preferredLanguage = defaults.locale;
          }
        }
      }
      
      // Check rate limit before sending OTP
      try {
        const rateLimitResponse = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            isSignupMode,
          }),
        });
        
        if (!rateLimitResponse.ok) {
          const rateLimitData = await rateLimitResponse.json();
          if (rateLimitResponse.status === 429) {
            const retryAfter = rateLimitData.retryAfter || 60;
            setEmailError(t('auth.tooManyRequests') || `Too many requests. Please wait ${retryAfter} seconds.`);
            toast.error(t('auth.tooManyRequests') || 'Too many requests', {
              description: `Please wait ${retryAfter} seconds before requesting another code.`,
              duration: 5000,
            });
            setIsLoading(false);
            return;
          }
          // If rate limit check fails for other reasons, log but continue
          console.warn('Rate limit check failed:', rateLimitData);
        }
      } catch (rateLimitError) {
        // If rate limit API fails, log but continue (graceful degradation)
        console.warn('Rate limit check error:', rateLimitError);
      }
      
      // Use signInWithOtp for both login and signup
      // For signups, shouldCreateUser: true will create the user
      // For login, shouldCreateUser: false will only work for existing users
      const { error } = await supabase.auth.signInWithOtp({ 
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: isSignupMode,
          data: isSignupMode ? {
            app_type: 'business',
            preferred_country: preferredCountry,
            preferred_language: preferredLanguage,
          } : undefined,
        },
      });
      
      if (error) {
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (!isSignupMode) {
          // LOGIN MODE: Check for any error indicating user doesn't exist
          // This includes "signups not allowed" which Supabase returns when shouldCreateUser: false
          // and the user doesn't exist
          if (
            errorMessage.includes('user not found') ||
            errorMessage.includes('email not found') ||
            errorMessage.includes('no user found') ||
            errorMessage.includes('user does not exist') ||
            errorMessage.includes('email does not exist') ||
            errorMessage.includes('invalid login credentials') ||
            errorMessage.includes('signups not allowed') ||
            errorMessage.includes('signup not allowed') ||
            error.code === 'user_not_found'
          ) {
            setEmailError(t('auth.noAccountWithEmail'));
            setAccountNotFound(true);
            setIsLoading(false);
            return;
          }
        } else {
          // SIGNUP MODE: Handle "signups not allowed" error - this means email signups are disabled
          if (errorMessage.includes('signups not allowed') || errorMessage.includes('signup not allowed')) {
            setEmailError(t('auth.signupsDisabled') || 'Unable to create account with email. Please use Google sign-in or contact support.');
            toast.error(isRTL ? 'خطأ في التسجيل' : 'Signup Error', {
              description: isRTL 
                ? 'التسجيل بالبريد الإلكتروني غير متاح حالياً. يرجى استخدام تسجيل الدخول بجوجل.'
                : 'Email signups may be temporarily unavailable. Please try Google sign-in instead.',
              duration: 8000,
            });
            setIsLoading(false);
            return;
          }
        }
        
        setEmailError(error.message || t('auth.failedToSend'));
        toast.error(t('common.error'), {
          description: error.message || t('auth.failedToSend'),
          duration: 5000,
        });
        setIsLoading(false);
        return;
      }

      setOtpSent(true);
      setShowOtp(true);
      
      const timerDuration = 120;
      setResendTimer(timerDuration);
      setCanResend(false);
      const timerEndTime = Date.now() + (timerDuration * 1000);
      localStorage.setItem('otp_timer_end', timerEndTime.toString());
      
      localStorage.setItem('otp_email', email.trim());
      localStorage.setItem('otp_signup_mode', isSignupMode.toString());
      
      const url = new URL(window.location.href);
      url.searchParams.set('step', 'otp');
      window.history.replaceState({}, '', url.toString());
      
      toast.success(t('auth.codeSent'), {
        description: t('auth.checkEmail'),
        duration: 5000,
      });
    } catch (err: unknown) {
      // Use standardized error handling
      const errorMessage = handleError(err, 'SendOTP');
      setEmailError(errorMessage);
      toast.error(t('common.error'), {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || !email.trim()) return;
    
    setIsLoading(true);
    setOtpError('');
    setOtp(['', '', '', '', '', '']);
    
    try {
      // Check rate limit before resending OTP
      try {
        const rateLimitResponse = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            isSignupMode,
          }),
        });
        
        if (!rateLimitResponse.ok && rateLimitResponse.status === 429) {
          const rateLimitData = await rateLimitResponse.json();
          const retryAfter = rateLimitData.retryAfter || 60;
          setOtpError(t('auth.tooManyRequests') || `Too many requests. Please wait ${retryAfter} seconds.`);
          toast.error(t('auth.tooManyRequests') || 'Too many requests', {
            description: `Please wait ${retryAfter} seconds before requesting another code.`,
            duration: 5000,
          });
          setIsLoading(false);
          return;
        }
      } catch (rateLimitError) {
        // If rate limit API fails, log but continue (graceful degradation)
        console.warn('Rate limit check error:', rateLimitError);
      }
      
      const { error } = await supabase.auth.signInWithOtp({ 
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: isSignupMode,
          data: {
            app_type: 'business',
          },
        },
      });
      
      if (error) {
        setOtpError(error.message || t('auth.failedToSend'));
        toast.error(t('common.error'), {
          description: error.message || t('auth.failedToSend'),
          duration: 5000,
        });
        setIsLoading(false);
        return;
      }

      const timerDuration = 120;
      setResendTimer(timerDuration);
      setCanResend(false);
      const timerEndTime = Date.now() + (timerDuration * 1000);
      localStorage.setItem('otp_timer_end', timerEndTime.toString());
      
      toast.success(t('auth.codeSent'), {
        description: t('auth.checkEmail'),
        duration: 5000,
      });
    } catch (err: unknown) {
      // Use standardized error handling
      const errorMessage = handleError(err, 'ResendOTP');
      setOtpError(errorMessage);
      toast.error(t('common.error'), {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get localized URLs for navigation
  // Compute URLs deterministically using pathname and locale to prevent hydration mismatches
  // Parse locale-country from pathname first, then use locale from context as fallback
  const parsedLocaleCountry = useMemo(() => parseLocaleCountry(pathname), [pathname]);
  const currentLocale = parsedLocaleCountry?.locale || locale;
  const currentCountry = parsedLocaleCountry?.country || 'SA';
  
  const loginUrl = useMemo(() => {
    const cleanPath = '/auth/login'.replace(/^\/[a-z]{2}-[a-z]{2}/i, '') || '/';
    return `/${currentLocale}-${currentCountry.toLowerCase()}${cleanPath === '/' ? '' : cleanPath}`;
  }, [currentLocale, currentCountry]);
  
  const signupUrl = useMemo(() => {
    const cleanPath = '/auth/signup'.replace(/^\/[a-z]{2}-[a-z]{2}/i, '') || '/';
    return `/${currentLocale}-${currentCountry.toLowerCase()}${cleanPath === '/' ? '' : cleanPath}`;
  }, [currentLocale, currentCountry]);

  return (
    <div className="h-screen flex flex-col bg-white relative overflow-hidden" dir={dir}>
      {/* Decorative Product Images */}
      {decorativeProducts.map((product, index) => {
        const floatDelay = 0.9 + product.delay + 2 + index * 0.15;
        
        return (
          <div
            key={product.name}
            className={`absolute ${product.position} z-0 hidden lg:block animate-product-intro animate-product-float`}
            style={{
              '--intro-delay': `${product.delay}s`,
              '--float-delay': `${floatDelay}s`,
              '--base-rotation': `${product.rotationDegrees}deg`
            } as React.CSSProperties & { '--intro-delay': string; '--float-delay': string; '--base-rotation': string }}
          >
            <Image
              src={`${PRODUCTS_STORAGE_URL}/${product.name}.png`}
              alt={product.alt}
              width={product.size.width}
              height={product.size.height}
              className={`object-contain ${product.rotate}`}
              unoptimized
            />
          </div>
        );
      })}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 px-4 relative z-10 min-h-0 overflow-hidden">
        <div className="w-full max-w-sm relative z-10">
          {/* Account Deleted Alert */}
          {reason === 'account_deleted' && (
            <div className={`mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">{t('auth.accountRemoved')}</h3>
                <p className="text-sm text-red-600 mt-1">
                  {t('auth.accountRemovedDescription')}
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              {isSignupMode ? t('auth.createAccount') : t('auth.loginToAccount')}
            </h1>
            <p className="text-lg text-gray-400">
              {isSignupMode ? t('auth.createAccountSubtitle') : t('auth.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Sign In Button - Hide when OTP is shown */}
            {!showOtp && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full h-12 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-900 shadow-none rounded-md"
                >
                  {isGoogleLoading ? (
                    <Loader2 className={`h-5 w-5 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  ) : (
                    <svg className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  {t('auth.continueWithGoogle')}
                </Button>

                {/* OR Separator */}
                <div className="relative flex items-center my-6">
                  <Separator className="flex-1" />
                  <span className="px-4 text-sm text-gray-500 bg-white">{t('auth.or')}</span>
                  <Separator className="flex-1" />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder={t('auth.email')}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      className={`h-12 bg-white border ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : emailCheckStatus?.shouldLogin && isSignupMode && validateEmail(email) && !isCheckingEmail ? 'border-amber-500 focus:border-amber-500 focus:ring-amber-500' : (emailCheckStatus?.exists || (!isSignupMode && emailCheckStatus?.shouldLogin)) && validateEmail(email) && !isCheckingEmail ? 'border-green-500 focus:border-green-500 focus:ring-green-500' : 'border-gray-200 focus:border-gray-300 focus:ring-gray-300'} rounded-md ${isRTL ? 'text-right' : 'text-left'} ${(emailCheckStatus?.shouldLogin && isSignupMode || (emailCheckStatus?.exists || (!isSignupMode && emailCheckStatus?.shouldLogin))) && validateEmail(email) && !isCheckingEmail ? (isRTL ? 'pl-10' : 'pr-10') : ''} focus:ring-2 focus:ring-offset-0`}
                      required
                      disabled={isLoading || isGoogleLoading}
                      autoFocus
                    />
                    {/* Amber triangle icon when account already exists (signup mode) */}
                    {emailCheckStatus?.shouldLogin && isSignupMode && validateEmail(email) && !isCheckingEmail && !emailError && (
                      <AlertTriangle className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-amber-600 fill-amber-50 ${isRTL ? 'left-3' : 'right-3'}`} />
                    )}
                    {/* Green checkmark only when account exists */}
                    {!emailError && !(emailCheckStatus?.shouldLogin && isSignupMode) && emailCheckStatus && (emailCheckStatus.exists === true || (!isSignupMode && emailCheckStatus.shouldLogin === true)) && validateEmail(email) && !isCheckingEmail && (
                      <CheckCircle2 className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 ${isRTL ? 'left-3' : 'right-3'}`} />
                    )}
                  </div>
                  {emailError && (
                    <div className={`flex items-start gap-2 text-xs text-red-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Mail className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  )}
                  {/* Email Check Status */}
                  {!emailError && emailCheckStatus && validateEmail(email) && !isCheckingEmail && (
                    <div className={`flex items-start gap-2 text-xs ${isRTL ? 'flex-row-reverse' : ''} ${
                      emailCheckStatus.shouldLogin && isSignupMode
                        ? 'text-amber-600'
                        : emailCheckStatus.shouldSignup && !isSignupMode
                        ? 'text-red-500'
                        : 'text-gray-600'
                    }`}>
                      {emailCheckStatus.shouldLogin && isSignupMode ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>
                            {t('auth.accountExists') || 'An account with this email already exists. Please '}
                            <Link 
                              href={`${loginUrl}?email=${encodeURIComponent(email)}`}
                              className="underline hover:no-underline font-medium"
                            >
                              {t('auth.signIn') || 'log in'}
                            </Link>
                            {' instead.'}
                          </span>
                        </>
                      ) : emailCheckStatus.shouldSignup && !isSignupMode ? (
                        <>
                          <Mail className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>
                            {t('auth.noAccountFound') || 'No account found with this email'}{' '}
                            <Link 
                              href={`${signupUrl}?email=${encodeURIComponent(email)}`}
                              className="underline hover:no-underline font-medium"
                            >
                              {t('auth.createAccountButton') || 'Create account'}
                            </Link>
                          </span>
                        </>
                      ) : null}
                    </div>
                  )}
                  {isCheckingEmail && validateEmail(email) && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{t('auth.checkingEmail') || 'Checking...'}</span>
                    </div>
                  )}
                </div>

                {/* Continue Button - Only show if OTP not sent */}
                {!otpSent && (
                  <Button
                    type="submit"
                    disabled={isLoading || isGoogleLoading || !validateEmail(email) || accountNotFound || (emailCheckStatus?.shouldLogin && isSignupMode)}
                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className={`h-5 w-5 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('common.loading')}
                      </>
                    ) : (
                      isSignupMode ? t('auth.createAccountButton') : t('auth.signInButton')
                    )}
                  </Button>
                )}
              </>
            )}

            {/* OTP Inputs - Show with fade animation */}
            {showOtp && (
              <div className="space-y-4 animate-fadeInUp">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 text-center mb-4">
                    {t('auth.codeSent')} <span className="font-medium text-gray-900">{email}</span>{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtp(false);
                        setOtpSent(false);
                        setOtp(['', '', '', '', '', '']);
                        setOtpError('');
                        setEmailError('');
                        cleanupOtpState();
                        setTimeout(() => {
                          const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
                          emailInput?.focus();
                        }, 100);
                      }}
                      className="text-sm underline hover:opacity-80"
                      style={{ color: '#F4610B' }}
                    >
                      {t('auth.changeEmail')}
                    </button>
                  </p>
                  
                  <OtpInput
                    ref={otpInputRef}
                    length={6}
                    value={otp}
                    onChange={setOtp}
                    onComplete={handleOtpComplete}
                    error={otpError}
                    disabled={isVerifying}
                    autoFocus={true}
                  />
                  
                  {/* Submit Button */}
                  <Button
                    type="button"
                    onClick={() => {
                      const otpCode = otp.join('')
                      if (otpCode.length === 6) {
                        handleVerifyOtp(otpCode)
                      }
                    }}
                    disabled={otp.join('').length !== 6 || isVerifying}
                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className={`h-5 w-5 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('common.loading')}
                      </>
                    ) : (
                      t('auth.verifyCode') || 'Verify Code'
                    )}
                  </Button>
                  
                  {/* Timer and Resend Code */}
                  <div className="flex flex-col items-center gap-2 mt-4">
                    {resendTimer > 0 ? (
                      <p className="text-xs font-medium text-center" style={{ color: '#F4610B' }}>
                        {locale === 'ar' 
                          ? `إعادة إرسال الرمز خلال ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}`
                          : `Resend code in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}`
                        }
                      </p>
                    ) : canResend ? (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="text-sm text-gray-900 hover:text-gray-700 underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('common.loading')}
                          </span>
                        ) : (
                          t('auth.resendCode')
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Toggle between Login and Signup - Hide when OTP is shown */}
            {!showOtp && (
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  {isSignupMode ? (
                    <>
                      {t('auth.haveAccount') || 'Already have an account? '}
                      <Link
                        href={loginUrl}
                        className="text-gray-900 underline font-medium hover:text-gray-700"
                      >
                        {t('auth.signIn') || 'Sign in'}
                      </Link>
                    </>
                  ) : (
                    <>
                      {t('auth.noAccount')}{' '}
                      <Link
                        href={signupUrl}
                        className="text-gray-900 underline font-medium hover:text-gray-700"
                      >
                        {t('auth.createAccount')}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            )}
          </form>

          {/* Partner Logos Section */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-400 mb-5">
              {t('auth.joinBusinesses')}
            </p>
            <div className="flex flex-nowrap items-center justify-center gap-6 w-full px-4">
              {ecommerceLogos.map((logo) => (
                <Image
                  key={logo.name}
                  src={`${ECOMMERCE_STORAGE_URL}/${logo.name}.png`}
                  alt={logo.alt}
                  width={180}
                  height={60}
                  className="h-12 w-auto object-contain grayscale opacity-30 hover:grayscale-0 hover:opacity-100 hover:animate-logo-pulse transition-all duration-300 cursor-pointer"
                  unoptimized
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="w-full py-5 text-center relative z-10 flex-shrink-0">
        <p className="text-xs text-gray-400">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
}

