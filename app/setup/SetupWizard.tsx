'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Mail, Loader2, Building2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { Session } from '@supabase/supabase-js';

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
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2>(initialSession ? 2 : 1);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Auth state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);

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

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Step 1: Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/business/auth/callback?next=/business/setup`;
      
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

      setEmailSent(true);
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

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error creating business account:', error);
      toast.error('Error', {
        description: error.message || 'Failed to create business account. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
              currentStep >= 1 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-background border-muted-foreground/30 text-muted-foreground'
            }`}>
              {currentStep > 1 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">1</span>
              )}
            </div>
            <span className={`text-sm font-medium transition-colors ${currentStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Account
            </span>
          </div>
          
          <Separator className="w-16" />
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
              currentStep >= 2 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-background border-muted-foreground/30 text-muted-foreground'
            }`}>
              {currentStep > 2 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">2</span>
              )}
            </div>
            <span className={`text-sm font-medium transition-colors ${currentStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Business
            </span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="border shadow-sm">
          {/* Step 1: Authentication */}
          {currentStep === 1 && (
            <>
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl md:text-2xl">Create your account</CardTitle>
                    <CardDescription className="text-base mt-2">
                      Sign in with your email to get started.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>

              {!emailSent ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEmail(value);
                        setEmailError('');
                        setIsEmailValid(validateEmail(value));
                      }}
                      className={emailError ? 'border-destructive' : ''}
                      required
                      disabled={isLoading}
                    />
                    {emailError && (
                      <p className="text-sm text-destructive">{emailError}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || !isEmailValid}
                    size="lg"
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Continue with Email'
                    )}
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <Mail className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl mb-2 text-center">Check your email</CardTitle>
                  <CardDescription className="text-center max-w-sm mb-4">
                    We sent a magic link to <span className="text-foreground font-medium">{email}</span>. 
                    Click the link in the email to continue.
                  </CardDescription>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                  >
                    Use a different email
                  </Button>
                </div>
              )}
              </CardContent>
            </>
          )}

          {/* Step 2: Business Setup */}
          {currentStep === 2 && (
            <>
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl md:text-2xl">Set up your business</CardTitle>
                    <CardDescription className="text-base mt-2">
                      Tell us about your business to get started.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>

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
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

