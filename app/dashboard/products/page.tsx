import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'
import { ProductsContent } from './products-content'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const cookieStore = await cookies();
    const loginUrl = getLocalizedUrlFromRequest('/auth/login', {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name);
          return cookie ? { value: cookie.value } : undefined;
        }
      }
    });
    redirect(loginUrl);
  }

  // Check if user has completed setup
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!merchantUser?.merchant_id) {
    const cookieStore = await cookies();
    const setupUrl = getLocalizedUrlFromRequest('/setup', {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name);
          return cookie ? { value: cookie.value } : undefined;
        }
      }
    });
    redirect(setupUrl);
  }

  return (
    <ProductsContent />
  )
}
