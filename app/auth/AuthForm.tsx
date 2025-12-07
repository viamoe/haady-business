'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOtp({ 
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      
      if (error) {
        setEmailError(error.message || 'Failed to send magic link. Please try again.');
        toast.error('Error', {
          description: error.message || 'Failed to send magic link. Please try again.',
          duration: 5000,
        });
        setIsLoading(false);
        return;
      }

      setSent(true);
      toast.success('Check your email', {
        description: 'We sent you a magic link to sign in.',
        duration: 10000,
      });
    } catch (err: any) {
      console.error('Error sending magic link:', err);
      setEmailError('An error occurred. Please try again.');
      toast.error('Error', {
        description: 'An error occurred while sending the magic link. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md bg-[#0F0F0F] rounded-4xl p-8 md:p-10">
        {!sent ? (
          <>
            {/* Header */}
            <div className="flex flex-col items-start mb-8">
              {/* Heading */}
              <h1 className="text-3xl md:text-2xl font-medium text-white mb-2 text-left">
                Welcome to Haady Business
              </h1>
              
              {/* Tagline */}
              <p className="text-normal md:text-[18px] font-normal text-muted-foreground text-left">
                Sign in to manage your business and stores.
              </p>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEmail(value);
                    setEmailError('');
                    setIsEmailValid(validateEmail(value));
                  }}
                  className={`w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground ${
                    emailError ? 'border border-destructive' : ''
                  }`}
                  required
                  disabled={isLoading || sent}
                />
                {emailError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading || sent || !isEmailValid}
                className={`w-full h-12 text-white border-0 transition-colors !bg-[#1a1a1a] hover:!bg-[#252525] ${
                  !isLoading && !sent && isEmailValid
                    ? '!bg-[#0062fb] hover:!bg-[#0052d9]'
                    : ''
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Continue with Email'
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-0 flex items-center justify-center mb-6">
              <Mail className="h-10 w-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2 text-center">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              We sent a magic link to <span className="text-white font-medium">{email}</span>. Click the link in the email to sign in.
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="text-muted-foreground hover:text-white"
            >
              Use a different email
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

