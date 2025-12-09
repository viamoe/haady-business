'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Paperclip, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useLoading } from '@/lib/loading-context';

interface AuthFormProps {
  reason?: string;
}

export default function AuthForm({ reason }: AuthFormProps) {
  const t = useTranslations();
  const router = useRouter();
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
  const [isSignupMode, setIsSignupMode] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Pre-fill email from query params if available
  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
      // Clear the email param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Clean up logout param from URL after showing message
  useEffect(() => {
    if (reason === 'account_deleted') {
      // Clean up logout param from URL after a short delay
      const timer = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('logout');
        window.history.replaceState({}, '', url.toString());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [reason]);

  // No automatic email validation - validation happens on button click

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
        
        setLoading(true, 'Checking your account...');
        
        const { data: merchantUser } = await supabase
          .from('merchant_users')
          .select('merchant_id')
          .eq('auth_user_id', data.user?.id || data.session?.user.id)
          .single();

        if (merchantUser) {
          setLoading(true, 'Redirecting to dashboard...');
          router.push('/dashboard');
          router.refresh();
        } else {
          setLoading(true, 'Setting up your account...');
          router.push('/setup');
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
      // Use the exact redirect URL that's in Supabase's allowed list
      // This must match exactly: https://business.haady.app/login/callback
      const isLocalhost = window.location.hostname === 'localhost';
      const redirectUrl = isLocalhost 
        ? 'http://localhost:3002/login/callback'
        : 'https://business.haady.app/login/callback';
      
      console.log('Google OAuth redirect URL:', redirectUrl);
      console.log('Current origin:', window.location.origin);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
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
        description: 'An error occurred while signing in with Google',
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
      // Send OTP - allow creating new users in signup mode
      const { error } = await supabase.auth.signInWithOtp({ 
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: isSignupMode, // Allow new users in signup mode
          data: {
            app_type: 'merchant',
          },
        },
      });
      
      if (error) {
        // In login mode, check if error indicates user doesn't exist
        if (!isSignupMode) {
          const errorMessage = error.message?.toLowerCase() || '';
          if (
            errorMessage.includes('user not found') ||
            errorMessage.includes('email not found') ||
            errorMessage.includes('no user found') ||
            errorMessage.includes('user does not exist') ||
            errorMessage.includes('email does not exist')
          ) {
            setEmailError("You don't have an account. Please create one instead.");
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

  return (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {/* Decorative Paperclip Icon */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 hidden lg:block">
          <Paperclip className="h-32 w-32 text-gray-400" />
              </div>

        <div className="w-full max-w-md relative z-10">
          {/* Account Deleted Alert */}
          {reason === 'account_deleted' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">Account Removed</h3>
                <p className="text-sm text-red-600 mt-1">
                  Your account has been deleted. Please contact support if you believe this was a mistake.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              {isSignupMode ? t('auth.createAccount') : t('auth.loginToAccount')}
            </h1>
            <p className="text-base text-gray-600">
              {isSignupMode ? 'Create your business account to get started' : t('auth.subtitle')}
            </p>
              </div>

          {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={isLoading || isGoogleLoading || !validateEmail(email)}
                className="w-full h-12 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white rounded-md"
                >
                  {isLoading ? (
                    <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {t('common.loading')}
                    </>
                  ) : (
                  isSignupMode ? 'Create account' : 'Sign in'
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

            {/* Toggle between Login and Signup */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isSignupMode ? (
                  <>
                    {t('auth.haveAccount') || 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignupMode(false);
                        setEmailError('');
                        setOtpSent(false);
                        setShowOtp(false);
                        setOtp(['', '', '', '', '', '']);
                      }}
                      className="text-gray-900 underline font-medium hover:text-gray-700 cursor-pointer"
                    >
                      {t('auth.signIn') || 'Sign in'}
                    </button>
                  </>
                ) : (
                  <>
                    {t('auth.noAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignupMode(true);
                        setEmailError('');
                        setOtpSent(false);
                        setShowOtp(false);
                        setOtp(['', '', '', '', '', '']);
                      }}
                      className="text-gray-900 underline font-medium hover:text-gray-700 cursor-pointer"
                    >
                      {t('auth.createAccount')}
                    </button>
                  </>
                )}
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
        </div>
      </div>
    </div>
  );
}
