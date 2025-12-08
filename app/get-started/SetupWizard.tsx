'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Loader2, Building2, CheckCircle2, Paperclip } from 'lucide-react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { useLoading } from '@/lib/loading-context';

interface SetupWizardProps {
  initialSession: Session | null;
}

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Portugal',
  'Greece',
  'Ireland',
  'Other',
];

const BUSINESS_TYPES = [
  'Retail',
  'E-commerce',
  'Restaurant',
  'Fashion',
  'Electronics',
  'Beauty & Cosmetics',
  'Home & Garden',
  'Sports & Outdoors',
  'Health & Wellness',
  'Food & Beverage',
  'Automotive',
  'Real Estate',
  'Services',
  'Other',
];

export default function SetupWizard({ initialSession }: SetupWizardProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoading } = useLoading();
  const [currentStep, setCurrentStepState] = useState<1 | 2>(initialSession ? 2 : 1);
  const [session, setSession] = useState<Session | null>(initialSession);
  const isInitialMount = useRef(true);

  // Function to update step (URL will be updated by useEffect)
  const setCurrentStep = useCallback((step: 1 | 2) => {
    setCurrentStepState(step);
  }, []);

  // Initialize step from URL on mount only
  useEffect(() => {
    if (isInitialMount.current) {
      const stepParam = searchParams?.get('step');
      if (stepParam === '1' || stepParam === '2') {
        const step = parseInt(stepParam) as 1 | 2;
        setCurrentStepState(step);
      } else if (!initialSession) {
        // If no step param and no session, set step to 1
        setCurrentStepState(1);
      }
      isInitialMount.current = false;
    }
  }, []); // Only run on mount

  // Update URL when step changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) return;
    
    const url = new URL(window.location.href);
    const currentStepParam = url.searchParams.get('step');
    
    // Only update if URL doesn't match current step
    if (currentStepParam !== currentStep.toString()) {
      url.searchParams.set('step', currentStep.toString());
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentStep]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Step 1: Auth state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 2: Business setup state
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    contact_email: session?.user.email || '',
    contact_phone: '',
    address: '',
    city: '',
    country: '',
    business_type: '',
  });

  // Check for session changes (when user clicks magic link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession && !session) {
        setSession(currentSession);
        setCurrentStep(2);
        setFormData(prev => ({ ...prev, contact_email: currentSession.user.email || '' }));
      }
    };

    // Check immediately
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession && !session) {
        setSession(newSession);
        setCurrentStep(2);
        setFormData(prev => ({ ...prev, contact_email: newSession.user.email || '' }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session]);

  // Pre-fill email from query params if available
  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Sync step with URL parameter (only when URL changes externally, not when state changes)
  useEffect(() => {
    if (isInitialMount.current) return; // Skip on initial mount
    
    const stepParam = searchParams?.get('step');
    if (stepParam === '1' || stepParam === '2') {
      const step = parseInt(stepParam) as 1 | 2;
      setCurrentStepState(prevStep => {
        if (prevStep !== step) {
          return step;
        }
        return prevStep;
      });
    }
  }, [searchParams]);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // No automatic email validation - validation happens on button click

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Ensure we're using the business domain
      // In production, use business.haady.app, fallback to current origin for local dev
      const currentOrigin = window.location.origin;
      let businessOrigin = currentOrigin;
      
      // If we're on haady.app, redirect to business.haady.app
      if (currentOrigin.includes('haady.app') && !currentOrigin.includes('business.haady.app')) {
        businessOrigin = currentOrigin.replace('haady.app', 'business.haady.app');
      }
      
      // Construct full absolute URL for redirect
      const redirectUrl = new URL('/login/callback', businessOrigin);
      redirectUrl.searchParams.set('next', '/get-started');
      redirectUrl.searchParams.set('app_type', 'merchant');
      
      const redirectUrlString = redirectUrl.toString();
      console.log('Google OAuth redirect URL:', redirectUrlString);
      console.log('Current origin:', currentOrigin);
      console.log('Business origin:', businessOrigin);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrlString,
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
        description: 'An error occurred while signing in with Google',
        duration: 5000,
      });
      setIsGoogleLoading(false);
    }
  };

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
    const cleanedValue = value.replace(/[^0-9]/g, ''); // Only allow digits

    if (cleanedValue.length > 1) {
      // Handle paste event
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
        toast.success(t('auth.verificationSuccessful'), {
          description: t('auth.signedIn'),
          duration: 3000,
        });
        
        setLoading(true, 'Setting up your account...');
        
        setSession(data.session);
        setCurrentStep(2);
        setFormData(prev => ({ ...prev, contact_email: data.user?.email || data.session?.user.email || '' }));
        setShowOtp(false);
        setOtpSent(false);
        
        setLoading(false);
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

  // Step 1: Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!validateEmail(email)) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      });
      
      if (error) {
        // Check if user already exists
        const errorMessage = error.message || '';
        const isExistingUser = 
          errorMessage.toLowerCase().includes('user already registered') ||
          errorMessage.toLowerCase().includes('email already exists') ||
          errorMessage.toLowerCase().includes('user already exists') ||
          errorMessage.toLowerCase().includes('already registered');
        
        if (isExistingUser) {
          // Redirect to login page with email pre-filled
          router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`);
          return;
        }
        
        setEmailError(error.message || t('auth.failedToSend'));
        toast.error(t('common.error'), {
          description: error.message || t('auth.failedToSend'),
          duration: 5000,
        });
        setIsLoading(false);
        return;
      }

      // Show OTP inputs with fade animation
      setOtpSent(true);
      setShowOtp(true);
      toast.success(t('auth.codeSent'), {
        description: t('auth.checkEmail'),
        duration: 5000,
      });
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setEmailError('An error occurred. Please try again.');
      toast.error(t('common.error'), {
        description: 'An error occurred. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle business setup
  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error('Error', {
        description: 'Please authenticate first.',
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create merchant/business record
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          name: formData.name,
          legal_name: formData.legal_name || formData.name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          address: formData.address || null,
          city: formData.city || null,
          country: formData.country || null,
          business_type: formData.business_type || null,
          status: 'pending',
          kyc_status: 'pending',
        })
        .select()
        .single();

      if (merchantError) {
        throw merchantError;
      }

      // Step 2: Create merchant_user record
      const { error: merchantUserError } = await supabase
        .from('merchant_users')
        .insert({
          merchant_id: merchant.id,
          auth_user_id: session.user.id,
          role: 'manager',
        });

      if (merchantUserError) {
        await supabase.from('merchants').delete().eq('id', merchant.id);
        throw merchantUserError;
      }

      toast.success('Business account created!', {
        description: 'Your business account has been set up successfully.',
        duration: 5000,
      });

      setLoading(true, 'Redirecting to dashboard...');
      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      console.error('Error creating business account:', error);
      toast.error('Error', {
        description: error.message || 'Failed to create business account. Please try again.',
        duration: 5000,
      });
      setLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {/* Decorative Paperclip Icon */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 hidden lg:block">
          <Paperclip className="h-32 w-32 text-gray-400" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Step 1: Authentication */}
          {currentStep === 1 && (
            <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                {t('auth.createAccount')}
              </h1>
              <p className="text-base text-gray-600">
                {t('auth.subtitle')}
              </p>
                  </div>

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full h-12 bg-gray-100 border-0 hover:bg-gray-200 text-gray-900 shadow-none"
              >
                  {isGoogleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                <div className="relative flex items-center my-4">
                  <Separator className="flex-1" />
                  <span className="px-4 text-sm text-gray-500 bg-white">OR</span>
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
                        setIsEmailValid(validateEmail(e.target.value));
                      }}
                      className={`h-12 ${emailError ? 'border-red-500' : 'border-gray-300'}`}
                      required
                      disabled={isLoading || isGoogleLoading}
                      autoFocus
                    />
                  </div>
                  {emailError && (
                    <div className="flex items-start gap-2 text-sm text-red-500">
                      <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  )}
                </div>

                {/* Continue Button - Only show if OTP not sent */}
                {!otpSent && (
                  <Button
                    type="submit"
                    disabled={isLoading || isGoogleLoading || !isEmailValid}
                    className="w-full h-12 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white rounded-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {t('common.loading')}
                      </>
                    ) : (
                      t('common.continue')
                    )}
                  </Button>
                )}

                {/* OTP Inputs - Show with fade animation */}
                {showOtp && (
                  <div className="space-y-4 animate-fadeInUp">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 text-center">
                        {t('auth.codeSent')} <span className="font-medium text-gray-900">{email}</span>
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
                    </div>
                  </div>
                )}

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {t('auth.haveAccount')}{' '}
                  <Link href="/login" className="text-gray-900 underline font-medium hover:text-gray-700">
                    {t('common.login')}
                  </Link>
                </p>
              </div>
            </form>

            {/* Footer with Partner Logos */}
            <div className="mt-12 text-center">
              <p className="text-sm text-gray-600 mb-6">
                {t('auth.joinBusinesses')}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 opacity-40">
                <div className="text-xs font-medium text-gray-500">ACCELERA/TALENT</div>
                <div className="text-xs font-medium text-gray-500">dYdX</div>
                <div className="text-xs font-medium text-gray-500">PRÓSPERA</div>
                <div className="text-xs font-medium text-gray-500">ARABIAN ESTATES</div>
                <div className="text-xs font-medium text-gray-500">axis</div>
                <div className="text-xs font-medium text-gray-500">ETH SHANGHAI 2024</div>
              </div>
                </div>
            </>
          )}

          {/* Step 2: Business Setup */}
          {currentStep === 2 && (
            <div className="w-full max-w-3xl bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <CardHeader className="p-0 mb-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                  <CardTitle className="text-3xl md:text-2xl">{t('setup.setupYourBusiness')}</CardTitle>
                    <CardDescription className="text-base mt-2">
                    {t('setup.welcome')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleBusinessSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Business Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Acme Inc."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_name">Legal Name</Label>
                    <Input
                      id="legal_name"
                      type="text"
                      placeholder="Acme Inc. LLC"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">
                      Contact Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contact_email"
                      type="email"
                      placeholder="contact@business.com"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Business St"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="New York"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_type">Business Type</Label>
                    <Select
                      value={formData.business_type}
                      onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !formData.name || !formData.contact_email}
                    size="lg"
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating business account...
                      </>
                    ) : (
                      'Create Business Account'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

