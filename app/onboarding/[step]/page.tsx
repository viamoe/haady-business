import { createServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'
import { OnboardingWizard } from '../components/OnboardingWizard'
import { OnboardingErrorBoundary } from '../error-boundary-wrapper'
import {
  ONBOARDING_STEP_ORDER,
  ONBOARDING_STEP_MAPPING,
  DEFAULT_ONBOARDING_STEP,
  ONBOARDING_STEPS,
  isValidStep,
  getStepIndex,
  getOnboardingStepPath,
} from '@/lib/constants/onboarding'

export const dynamic = 'force-dynamic'

interface OnboardingStepPageProps {
  params: Promise<{ step: string }>
}

export default async function OnboardingStepPage({ params }: OnboardingStepPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params
  const step = resolvedParams.step

  // Validate step
  if (!isValidStep(step)) {
    const cookieStore = await cookies()
    const onboardingUrl = getLocalizedUrlFromRequest(getOnboardingStepPath(DEFAULT_ONBOARDING_STEP), {
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
  
  // Check if user already has a business account and get onboarding step
  const { data: businessProfile } = await supabase
    .from('business_profile')
    .select('id, store_id, is_onboarded, onboarding_step')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  
  // If user has completed onboarding (is_onboarded = true OR onboarding_step = NULL), redirect to dashboard
  if (businessProfile?.is_onboarded || businessProfile?.onboarding_step === null) {
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
  
  // Get the current onboarding step from database
  const currentOnboardingStep = businessProfile?.onboarding_step
  
  // Special check: If user is trying to access summary step, check if they have a store connection
  // This handles the case where OAuth callback just completed but DB hasn't updated onboarding_step yet
  let hasStoreConnection = false
  if (step === ONBOARDING_STEPS.SUMMARY && businessProfile?.store_id) {
    const { data: connection } = await supabase
      .from('store_connections')
      .select('id')
      .eq('store_id', businessProfile.store_id)
      .maybeSingle()
    hasStoreConnection = !!connection
  }
  
  // Determine the correct step to redirect to based on database
  // If onboarding_step is NULL or undefined, default to first step (shouldn't happen due to check above)
  const targetStep = currentOnboardingStep && ONBOARDING_STEP_MAPPING[currentOnboardingStep]
    ? ONBOARDING_STEP_MAPPING[currentOnboardingStep]
    : DEFAULT_ONBOARDING_STEP // Default to first step if no onboarding_step (shouldn't reach here if completed)
  
  // Step order for validation
  const requestedStepIndex = getStepIndex(step)
  const targetStepIndex = getStepIndex(targetStep)
  
  // Special case: If user is trying to access summary and they have a store connection (OAuth just completed), allow it
  const isTransitioningToSummary = step === ONBOARDING_STEPS.SUMMARY && hasStoreConnection
  
  // ALLOW going back to ANY previous step - don't redirect if user is going back
  // Only redirect if user is trying to skip AHEAD to a step they haven't reached yet
  const isGoingBack = requestedStepIndex < targetStepIndex
  const isGoingToSameStep = requestedStepIndex === targetStepIndex
  
  // Only redirect if user is trying to skip ahead (not going back, not same step, not transitioning to summary)
  if (!isGoingBack && !isGoingToSameStep && !isTransitioningToSummary) {
    const cookieStore = await cookies()
    const correctUrl = getLocalizedUrlFromRequest(getOnboardingStepPath(targetStep), {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name)
          return cookie ? { value: cookie.value } : undefined
        }
      }
    })
    redirect(correctUrl)
  }
  
  return (
    <OnboardingErrorBoundary>
      <OnboardingWizard />
    </OnboardingErrorBoundary>
  )
}

