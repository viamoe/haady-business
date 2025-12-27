import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  ONBOARDING_STEP_MAPPING,
  DEFAULT_ONBOARDING_STEP,
  getOnboardingStepPath,
} from '@/lib/constants/onboarding'

export const dynamic = 'force-dynamic'

export default async function OnboardingNewPage() {
  const supabase = await createServerSupabase()
  const cookieStore = await cookies()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // If not logged in, redirect to login
  if (!user) {
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
  
  // Check user's onboarding progress
  const { data: businessProfile } = await supabase
    .from('business_profile')
    .select('onboarding_step, is_onboarded')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  
  // If completed onboarding (is_onboarded = true OR onboarding_step = NULL), redirect to dashboard
  if (businessProfile?.is_onboarded || businessProfile?.onboarding_step === null) {
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
  
  // Determine correct step based on database
  const targetStep = businessProfile?.onboarding_step && ONBOARDING_STEP_MAPPING[businessProfile.onboarding_step]
    ? ONBOARDING_STEP_MAPPING[businessProfile.onboarding_step]
    : DEFAULT_ONBOARDING_STEP
  
  const targetUrl = getLocalizedUrlFromRequest(getOnboardingStepPath(targetStep), {
    cookies: {
      get: (name: string) => {
        const cookie = cookieStore.get(name)
        return cookie ? { value: cookie.value } : undefined
      }
    }
  })
  redirect(targetUrl)
}

