import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'

export const dynamic = 'force-dynamic'

export default async function OnboardingNewPage() {
  // Redirect to first step
  const cookieStore = await cookies()
  const firstStepUrl = getLocalizedUrlFromRequest('/onboarding/personal-details', {
    cookies: {
      get: (name: string) => {
        const cookie = cookieStore.get(name)
        return cookie ? { value: cookie.value } : undefined
      }
    }
  })
  redirect(firstStepUrl)
}

