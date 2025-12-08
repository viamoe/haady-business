'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useLoading } from '@/lib/loading-context';

// Zod schema for form validation
const onboardingSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(50, 'Business name must be at most 50 characters'),
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(50, 'Store name must be at most 50 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  storeSlug: z.string().min(3, 'Store slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Store slug can only contain lowercase letters, numbers, and hyphens'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

// Helper function to generate kebab-case slug from store name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export default function OnboardingForm() {
  const router = useRouter();
  const { setLoading } = useLoading();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName: '',
      storeName: '',
      city: '',
      storeSlug: '',
    },
  });

  // Watch storeName to auto-generate slug
  const storeName = useWatch({ control, name: 'storeName' });

  // Auto-generate slug when storeName changes
  useEffect(() => {
    if (storeName) {
      const generatedSlug = generateSlug(storeName);
      setValue('storeSlug', generatedSlug, { shouldValidate: true });
    }
  }, [storeName, setValue]);

  const onSubmit = async (values: OnboardingFormData) => {
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('create_merchant_onboarding', {
        business_name: values.businessName,
        store_name: values.storeName,
        store_slug: values.storeSlug,
        store_city: values.city,
      });

      if (error) {
        throw error;
      }

      // Check response format
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success === true) {
          toast.success('Business account created!', {
            description: 'Your business and store have been set up successfully.',
            duration: 5000,
          });
          setLoading(true, 'Redirecting to dashboard...');
          router.push('/dashboard');
          router.refresh();
        } else {
          // RPC returned success: false
          const errorMessage = (data as { error?: string }).error || 'Failed to create business account';
          toast.error('Error', {
            description: errorMessage,
            duration: 5000,
          });
        }
      } else {
        // Unexpected response format
        throw new Error('Unexpected response from server');
      }
    } catch (err: any) {
      console.error('Error creating merchant onboarding:', err);
      const errorMessage = err.message || 'Failed to create business account. Please try again.';
      toast.error('Error', {
        description: errorMessage,
        duration: 5000,
      });
      setLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Business Setup</h1>
            <p className="text-base text-gray-600">
              Create your business account and first store to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="businessName"
                {...register('businessName')}
                placeholder="Acme Inc."
                className={errors.businessName ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.businessName && (
                <p className="text-sm text-red-500">{errors.businessName.message}</p>
              )}
            </div>

            {/* Store Name */}
            <div className="space-y-2">
              <Label htmlFor="storeName">
                Store Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="storeName"
                {...register('storeName')}
                placeholder="Main Store"
                className={errors.storeName ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.storeName && (
                <p className="text-sm text-red-500">{errors.storeName.message}</p>
              )}
            </div>

            {/* Store Slug (Auto-generated) */}
            <div className="space-y-2">
              <Label htmlFor="storeSlug">
                Store Slug <span className="text-red-500">*</span>
                <span className="text-sm text-gray-500 ml-2">(Auto-generated from store name)</span>
              </Label>
              <Input
                id="storeSlug"
                {...register('storeSlug')}
                placeholder="main-store"
                className={errors.storeSlug ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.storeSlug && (
                <p className="text-sm text-red-500">{errors.storeSlug.message}</p>
              )}
              <p className="text-xs text-gray-500">
                This will be used in your store URL. Only lowercase letters, numbers, and hyphens are allowed.
              </p>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="New York"
                className={errors.city ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white rounded-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Business Account'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

