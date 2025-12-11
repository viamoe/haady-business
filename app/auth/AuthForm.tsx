'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { parseLocaleCountry, getLocaleCountryFromCookies, getDefaultLocaleCountry, getLocalizedUrl } from '@/lib/localized-url';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useLoading } from '@/lib/loading-context';

const SUPABASE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets';
const PRODUCTS_STORAGE_URL = `${SUPABASE_STORAGE_URL}/products`;
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
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isSignupMode = mode === 'signup';

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

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

  // Auto-focus first OTP input when shown
  useEffect(() => {
    if (showOtp) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [showOtp]);

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');

    if (cleanedValue.length > 1) {
      const pasteData = cleanedValue.slice(0, 6);
      const newOtp = [...otp];
      pasteData.split('').forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const lastFilledIndex = Math.min(index + pasteData.length - 1, 5);
      otpInputRefs.current[lastFilledIndex]?.focus();
      if (newOtp.every(digit => digit !== '')) {
        handleVerifyOtp(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanedValue;
    setOtp(newOtp);
    setOtpError('');

    if (cleanedValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    } else if (!cleanedValue && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    if (otpCode.length !== 6) return;

    setIsVerifying(true);
    setOtpError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode,
        type: 'email',
      });

      if (error) {
        const errorMessage = error.message || t('auth.verificationFailed');
        let displayError = errorMessage;
        
        if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
          displayError = t('auth.codeExpired');
        }
        
        setOtpError(displayError);
        toast.error(t('auth.verificationFailed'), {
          description: displayError,
          duration: 5000,
        });
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        return;
      }

      if (data?.session || data?.user) {
        cleanupOtpState();
        
        toast.success(t('auth.verificationSuccessful'), {
          description: t('auth.signedIn'),
          duration: 3000,
        });
        
        setLoading(true, 'Checking your account...');
        
        const { data: merchantUser } = await supabase
          .from('merchant_users')
          .select('merchant_id')
          .eq('auth_user_id', data.user?.id || data.session?.user.id)
          .single();

        if (merchantUser) {
          setLoading(true, 'Redirecting to dashboard...');
          const dashboardUrl = getLocalizedUrl('/dashboard', pathname);
          router.push(dashboardUrl);
          router.refresh();
        } else {
          setLoading(true, 'Setting up your account...');
          const setupUrl = getLocalizedUrl('/setup', pathname);
          router.push(setupUrl);
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setOtpError(t('common.error'));
      toast.error(t('common.error'), {
        description: t('common.error'),
        duration: 5000,
      });
      setLoading(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      let preferredCountry = 'AE';
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
      // IMPORTANT: The base redirect URL must EXACTLY match what's in Supabase Dashboard
      // Go to: Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
      // Add: https://business.haady.app/auth/callback (for production)
      // Add: http://localhost:3002/auth/callback (for development)
      // For preview deployments, use the current origin dynamically
      const baseRedirectUrl = isLocalhost 
        ? 'http://localhost:3002/auth/callback'
        : `${window.location.origin}/auth/callback`;
      
      // Build redirect URL with query parameters
      // Note: Supabase will append the OAuth code, so we add our params first
      const redirectUrl = new URL(baseRedirectUrl);
      redirectUrl.searchParams.set('app_type', 'merchant');
      redirectUrl.searchParams.set('preferred_country', preferredCountry);
      redirectUrl.searchParams.set('preferred_language', preferredLanguage);
      
      console.log('🔵 OAuth Configuration:');
      console.log('  Base redirect URL:', baseRedirectUrl);
      console.log('  Full redirect URL:', redirectUrl.toString());
      console.log('  Current origin:', window.location.origin);
      console.log('  ⚠️  Make sure this EXACT URL is in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs');
      
      const cookieData = JSON.stringify({
        app_type: 'merchant',
        preferred_country: preferredCountry,
        preferred_language: preferredLanguage,
        origin: window.location.origin, // Store the origin so haady.app can redirect back
        timestamp: Date.now(),
      });
      
      const isProduction = !isLocalhost;
      const cookieDomain = isProduction ? '; domain=.haady.app' : '';
      const secureCookie = isProduction ? '; Secure' : '';
      document.cookie = `haady_oauth_origin=${encodeURIComponent(cookieData)}; path=/; max-age=600; SameSite=Lax${cookieDomain}${secureCookie}`;
      
      console.log('Set OAuth origin cookie:', cookieData);
      
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
      let preferredCountry = 'AE';
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
      
      const { error } = await supabase.auth.signInWithOtp({ 
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: isSignupMode,
          data: {
            app_type: 'merchant',
            preferred_country: isSignupMode ? preferredCountry : undefined,
            preferred_language: isSignupMode ? preferredLanguage : undefined,
          },
        },
      });
      
      if (error) {
        if (!isSignupMode) {
          const errorMessage = error.message?.toLowerCase() || '';
          if (
            errorMessage.includes('user not found') ||
            errorMessage.includes('email not found') ||
            errorMessage.includes('no user found') ||
            errorMessage.includes('user does not exist') ||
            errorMessage.includes('email does not exist')
          ) {
            setEmailError(t('auth.noAccountError'));
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
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setEmailError(t('auth.errorOccurred'));
      toast.error(t('common.error'), {
        description: t('auth.errorOccurred'),
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
      const { error } = await supabase.auth.signInWithOtp({ 
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: isSignupMode,
          data: {
            app_type: 'merchant',
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
    } catch (err: any) {
      console.error('Error resending OTP:', err);
      setOtpError(t('auth.errorOccurred'));
      toast.error(t('common.error'), {
        description: t('auth.errorOccurred'),
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get localized URLs for navigation
  const loginUrl = getLocalizedUrl('/auth/login', pathname);
  const signupUrl = getLocalizedUrl('/auth/signup', pathname);

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
        <div className="w-full max-w-md relative z-10">
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
                      className={`h-12 bg-white border ${emailError ? 'border-red-500' : 'border-gray-200'} rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                      required
                      disabled={isLoading || isGoogleLoading}
                      autoFocus
                    />
                  </div>
                  {emailError && (
                    <div className={`flex items-start gap-2 text-sm text-red-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  )}
                </div>

                {/* Continue Button - Only show if OTP not sent */}
                {!otpSent && (
                  <Button
                    type="submit"
                    disabled={isLoading || isGoogleLoading || !validateEmail(email)}
                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-medium"
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
                  
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                          if (pasteData.length === 6) {
                            const newOtp = pasteData.split('');
                            setOtp(newOtp);
                            otpInputRefs.current[5]?.focus();
                            handleVerifyOtp(pasteData);
                          }
                        }}
                        ref={(el) => { otpInputRefs.current[index] = el; }}
                        className={`w-12 h-12 text-center text-lg font-semibold ${
                          otpError ? 'border-red-500' : 'border-gray-300'
                        }`}
                        disabled={isVerifying}
                      />
                    ))}
                  </div>
                  {otpError && (
                    <p className="text-sm text-red-500 text-center">{otpError}</p>
                  )}
                  {isVerifying && (
                    <div className="flex justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                  )}
                  
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

