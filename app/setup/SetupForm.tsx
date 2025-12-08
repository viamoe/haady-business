'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Building2, Store, Globe, ChevronDown } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useLoading } from '@/lib/loading-context';
import { Flag } from '@/components/flag';

interface Country {
  id: string;
  name: string;
  iso2: string;
  iso3?: string;
  phone_code?: string;
}

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
  country: z
    .string()
    .min(1, 'Please select a country'),
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function SetupForm() {
  const router = useRouter();
  const { setLoading } = useLoading();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      businessName: '',
      storeName: '',
      country: '',
    },
  });

  const country = watch('country');
  const selectedCountry = countries.find(c => c.id === country);

  // Fetch countries from database directly using Supabase client
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        console.log('Fetching countries from database...');
        
        // Gulf countries + Egypt ISO2 codes
        const GULF_COUNTRIES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG'];
        
        // Try 'countries' table first, fallback to 'countries_master'
        let { data: countriesData, error } = await supabase
          .from('countries')
          .select('id, name, iso2, iso3, phone_code')
          .in('iso2', GULF_COUNTRIES)
          .order('name', { ascending: true });

        if (error) {
          console.log('Error with countries table, trying countries_master:', error.message);
          // If 'countries' table doesn't exist, try 'countries_master'
          const { data: countriesMaster, error: masterError } = await supabase
            .from('countries_master')
            .select('id, name, iso2, iso3, phone_code')
            .in('iso2', GULF_COUNTRIES)
            .order('name', { ascending: true });

          if (masterError) {
            throw masterError;
          }
          
          countriesData = countriesMaster;
        }

        console.log('Countries fetched from DB:', countriesData?.length || 0);
        setCountries(countriesData || []);
      } catch (error: any) {
        console.error('Error fetching countries:', error);
        toast.error('Error', {
          description: error.message || 'Failed to load countries. Please refresh the page.',
          duration: 5000,
        });
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  const onSubmit = async (values: SetupFormData) => {
    setIsSubmitting(true);
    setLoading(true, 'Creating your business account...');

    try {
      // Get country data from selected country (values.country stores the country ID)
      const selectedCountryData = countries.find(c => c.id === values.country);
      if (!selectedCountryData) {
        throw new Error('Please select a valid country');
      }
      
      console.log('Creating merchant account with:', {
        business_name: values.businessName,
        store_name: values.storeName,
        selected_country_id: selectedCountryData.id,
      });

      // Call the RPC function to create merchant and store atomically
      const { data, error } = await supabase.rpc('create_merchant_onboarding', {
        business_name: values.businessName,
        store_name: values.storeName,
        selected_country_id: selectedCountryData.id,
      });

      if (error) {
        console.error('RPC error:', error);
        throw new Error(error.message || 'Failed to create merchant account');
      }

      console.log('RPC response:', data);

      // Handle response - could be JSON object or direct result
      if (data && typeof data === 'object') {
        if ('success' in data && data.success === false) {
          throw new Error((data as { error?: string }).error || 'Failed to create business');
        }
      }

      toast.success('Welcome to Haady Business!', {
        description: 'Your business has been created successfully.',
        duration: 5000,
      });
      
      setLoading(true, 'Redirecting to dashboard...');
      router.push('/dashboard');
      router.refresh();
      
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
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              Set Up Your Business
            </h1>
            <p className="text-base text-gray-600">
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

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                Country
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-12 w-full justify-between border border-gray-300 rounded-md shadow-xs bg-transparent hover:bg-transparent focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px] ${errors.country ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={isSubmitting || isLoadingCountries}
                  >
                    <div className="flex items-center gap-2">
                      {isLoadingCountries ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          <span className="text-gray-500">Loading countries...</span>
                        </>
                      ) : selectedCountry ? (
                        <>
                          <Flag countryName={selectedCountry.name} size="s" />
                          <span>{selectedCountry.name}</span>
                        </>
                      ) : (
                        <span className="text-gray-500">Select your country</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                  {countries.map((country) => (
                    <DropdownMenuItem
                      key={country.id}
                      onClick={() => setValue('country', country.id, { shouldValidate: true })}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Flag countryName={country.name} size="s" />
                      <span>{country.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.country && (
                <p className="text-sm text-red-500">{errors.country.message}</p>
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
