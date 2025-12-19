import { createServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'
import { OnboardingWizard } from '../components/OnboardingWizard'

export const dynamic = 'force-dynamic'

// Valid step IDs
const VALID_STEPS = ['personal-details', 'business-setup', 'connect-store']

interface OnboardingStepPageProps {
  params: Promise<{ step: string }>
}

export default async function OnboardingStepPage({ params }: OnboardingStepPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params
  const step = resolvedParams.step

  // Validate step
  if (!VALID_STEPS.includes(step)) {
    const cookieStore = await cookies()
    const onboardingUrl = getLocalizedUrlFromRequest('/onboarding/personal-details', {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name)
          return cookie ? { value: cookie.value } : undefined
        }
      }
    })
    redirect(onboardingUrl)
  }

  const supabase = await createServerSupabase()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    const cookieStore = await cookies()
    const loginUrl = getLocalizedUrlFromRequest('/auth/login', {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name)
          return cookie ? { value: cookie.value } : undefined
        }
      }
    })
    redirect(loginUrl)
  }
  
  // Check if user already has a business account with business_name set
  const { data: businessProfile } = await supabase
    .from('business_profile')
    .select('id, business_name')
    .eq('auth_user_id', user.id)
    .single()
  
  if (businessProfile?.business_name) {
    // User already has a business, redirect to dashboard
    const cookieStore = await cookies()
    const dashboardUrl = getLocalizedUrlFromRequest('/dashboard', {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name)
          return cookie ? { value: cookie.value } : undefined
        }
      }
    })
    redirect(dashboardUrl)
  }
  
  return <OnboardingWizard />
}

