'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { useLoading } from '@/lib/loading-context';

interface OtpVerificationFormProps {
  email: string;
}

export default function OtpVerificationForm({ email }: OtpVerificationFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { setLoading } = useLoading();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    otpInputRefs.current[0]?.focus();
  }, []);

  // Resend timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newOtp.every((digit) => digit !== '')) {
      const otpString = newOtp.join('');
      handleVerifyOtp(otpString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length === 6) {
          const newOtp = [...otp];
          digits.forEach((digit, i) => {
            if (i < 6) newOtp[i] = digit;
          });
          setOtp(newOtp);
          const otpString = newOtp.join('');
          if (otpString.length === 6) {
            handleVerifyOtp(otpString);
          }
        }
      });
    }
  };

  const handleVerifyOtp = async (otpCode?: string) => {
    const otpString = otpCode || otp.join('');
    
    if (otpString.length !== 6) {
      setOtpError(t('auth.invalidCode'));
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpString,
        type: 'email',
      });

      if (error) {
        let displayError = error.message || 'Invalid verification code. Please try again.';
        
        if (error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')) {
          displayError = t('auth.codeExpired');
        }
        
        setOtpError(displayError);
        toast.error(t('auth.verificationFailed'), {
          description: displayError,
          duration: 5000,
        });
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        setIsVerifying(false);
        return;
      }

      if (data.session && data.user) {
        toast.success(t('auth.verificationSuccessful'), {
          description: t('auth.signedIn'),
          duration: 3000,
        });

        setLoading(true, 'Checking your account...');

        // Check if user has a business account
        const { data: merchantUser } = await supabase
          .from('merchant_users')
          .select('merchant_id')
          .eq('auth_user_id', data.user.id)
          .single();

        if (merchantUser) {
          setLoading(true, 'Redirecting to dashboard...');
          router.push('/dashboard');
          router.refresh();
        } else {
          setLoading(true, 'Redirecting to setup...');
          router.push('/setup');
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setOtpError(t('common.error'));
      toast.error(t('common.error'), {
        description: t('auth.verificationFailed'),
        duration: 5000,
      });
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setCanResend(false);
    setResendTimer(60);
    setOtpError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        toast.error('Error', {
          description: error.message || 'Failed to resend code. Please try again.',
          duration: 5000,
        });
        setCanResend(true);
        setIsResending(false);
        return;
      }

      toast.success('Code sent', {
        description: 'A new verification code has been sent to your email.',
        duration: 5000,
      });
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      console.error('Error resending OTP:', err);
      toast.error('Error', {
        description: 'An error occurred while resending the code. Please try again.',
        duration: 5000,
      });
      setCanResend(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl">{t('auth.enterCode')}</CardTitle>
            <CardDescription className="text-base">
              {t('auth.codeSent')} <span className="text-foreground font-medium">{email}</span>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOtp();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="otp" className="sr-only">
                {t('auth.verificationCode')}
              </Label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-2xl font-semibold ${
                      otpError ? 'border-destructive' : ''
                    }`}
                    disabled={isVerifying}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              {otpError && (
                <div className="flex items-center gap-2 text-sm text-destructive justify-center">
                  <AlertCircle className="h-4 w-4" />
                  <span>{otpError}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isVerifying || otp.some((digit) => !digit)}
              size="lg"
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('auth.verifying')}
                </>
              ) : (
                t('auth.verifyCode')
              )}
            </Button>
          </form>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t('auth.didntReceive')}
              </p>
              <Button
                variant="ghost"
                onClick={handleResend}
                disabled={!canResend || isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('auth.resending')}
                  </>
                ) : resendTimer > 0 ? (
                  t('auth.resendIn', { seconds: resendTimer })
                ) : (
                  t('auth.resendCode')
                )}
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                asChild
                className="w-full"
              >
                <Link href="/login" className="flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t('auth.useDifferentEmail')}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

