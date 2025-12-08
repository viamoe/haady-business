'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useLoading } from '@/lib/loading-context';

interface BusinessSetupFormProps {
  userId: string;
  userEmail: string;
}

export default function BusinessSetupForm({ userId, userEmail }: BusinessSetupFormProps) {
  const router = useRouter();
  const { setLoading } = useLoading();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    contact_email: userEmail,
    contact_phone: '',
    address: '',
    city: '',
    country: '',
    business_type: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Step 2: Create merchant_user record linking auth user to merchant
      const { error: merchantUserError } = await supabase
        .from('merchant_users')
        .insert({
          merchant_id: merchant.id,
          auth_user_id: userId,
          role: 'manager', // First user is manager/owner
        });

      if (merchantUserError) {
        // Rollback: delete the merchant if merchant_user creation fails
        await supabase.from('merchants').delete().eq('id', merchant.id);
        throw merchantUserError;
      }

      toast.success('Business account created!', {
        description: 'Your business account has been set up successfully.',
        duration: 5000,
      });

      setLoading(true, 'Redirecting to dashboard...');
      router.push('/dashboard');
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
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl bg-[#0F0F0F] rounded-4xl p-8 md:p-10">
        {/* Header */}
        <div className="flex flex-col items-start mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border-0 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-2xl font-medium text-white mb-2 text-left">
            Set up your business
          </h1>
          <p className="text-normal md:text-[18px] font-normal text-muted-foreground text-left">
            Create your business account to start managing stores and operations.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Inc."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal_name" className="text-white">
                Legal Name
              </Label>
              <Input
                id="legal_name"
                type="text"
                placeholder="Acme Inc. LLC"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                className="w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="text-white">
                Contact Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="contact@business.com"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="text-white">
                Contact Phone
              </Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-white">
              Address
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="123 Business St"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-white">
                City
              </Label>
              <Input
                id="city"
                type="text"
                placeholder="New York"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-white">
                Country
              </Label>
              <Input
                id="country"
                type="text"
                placeholder="United States"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type" className="text-white">
                Business Type
              </Label>
              <Input
                id="business_type"
                type="text"
                placeholder="Retail, E-commerce, etc."
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="w-full h-12 bg-[#1a1a1a] border-0 text-white placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={isLoading || !formData.name || !formData.contact_email}
              className="w-full h-12 text-white border-0 !bg-[#0062fb] hover:!bg-[#0052d9] disabled:!bg-[#1a1a1a] disabled:hover:!bg-[#1a1a1a]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating business account...
                </span>
              ) : (
                'Create Business Account'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

