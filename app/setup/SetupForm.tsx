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
import { Loader2, Building2, Store, MapPin, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useLoading } from '@/lib/loading-context';

// Validation schema
const setupSchema = z.object({
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(50, 'Business name must be at most 50 characters'),
  storeName: z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(50, 'Store name must be at most 50 characters'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters'),
  storeSlug: z
    .string()
    .min(3, 'Store URL must be at least 3 characters')
    .max(30, 'Store URL must be at most 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
});

type SetupFormData = z.infer<typeof setupSchema>;

// Generate URL-friendly slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SetupForm() {
  const router = useRouter();
  const { setLoading } = useLoading();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      businessName: '',
      storeName: '',
      city: '',
      storeSlug: '',
    },
  });

  // Watch storeName to auto-generate slug
  const storeName = useWatch({ control, name: 'storeName' });

  useEffect(() => {
    if (storeName) {
      const generatedSlug = generateSlug(storeName);
      setValue('storeSlug', generatedSlug, { shouldValidate: true });
    }
  }, [storeName, setValue]);

  const onSubmit = async (values: SetupFormData) => {
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

      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success === true) {
          toast.success('Welcome to Haady Business!', {
            description: 'Your business has been created successfully.',
            duration: 5000,
          });
          setLoading(true, 'Redirecting to dashboard...');
          router.push('/dashboard');
          router.refresh();
        } else {
          const errorMessage = (data as { error?: string }).error || 'Failed to create business';
          toast.error('Error', {
            description: errorMessage,
            duration: 5000,
          });
        }
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err: any) {
      console.error('Error creating business:', err);
      toast.error('Error', {
        description: err.message || 'Failed to create business. Please try again.',
        duration: 5000,
      });
      setLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Set Up Your Business
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Tell us about your business to get started with Haady
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                Business Name
              </Label>
              <Input
                id="businessName"
                {...register('businessName')}
                placeholder="Your Company Name"
                className={`h-12 ${errors.businessName ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={isSubmitting}
              />
              {errors.businessName && (
                <p className="text-sm text-red-500">{errors.businessName.message}</p>
              )}
            </div>

            {/* Store Name */}
            <div className="space-y-2">
              <Label htmlFor="storeName" className="flex items-center gap-2">
                <Store className="w-4 h-4 text-gray-500" />
                Store Name
              </Label>
              <Input
                id="storeName"
                {...register('storeName')}
                placeholder="Main Store"
                className={`h-12 ${errors.storeName ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={isSubmitting}
              />
              {errors.storeName && (
                <p className="text-sm text-red-500">{errors.storeName.message}</p>
              )}
            </div>

            {/* Store URL (Slug) */}
            <div className="space-y-2">
              <Label htmlFor="storeSlug" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                Store URL
              </Label>
              <div className="flex items-center">
                <span className="h-12 px-4 flex items-center bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-sm text-gray-500">
                  haady.app/
                </span>
                <Input
                  id="storeSlug"
                  {...register('storeSlug')}
                  placeholder="your-store"
                  className={`h-12 rounded-l-none ${errors.storeSlug ? 'border-red-500 focus:ring-red-500' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.storeSlug && (
                <p className="text-sm text-red-500">{errors.storeSlug.message}</p>
              )}
              <p className="text-xs text-gray-500">
                This will be your store's public URL
              </p>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                City
              </Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="New York"
                className={`h-12 ${errors.city ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={isSubmitting}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg mt-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating your business...
                </>
              ) : (
                'Create Business'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          By continuing, you agree to Haady's Terms of Service and Privacy Policy
        </p>
      </main>
    </div>
  );
}

