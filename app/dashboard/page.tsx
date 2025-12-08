import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Check if user has completed setup
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!merchantUser?.merchant_id) {
    redirect('/setup')
  }

  // Get merchant details
  const { data: merchant } = await supabase
    .from('merchants')
    .select('name, status')
    .eq('id', merchantUser.merchant_id)
    .single()

  // Get store count
  const { count: storeCount } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantUser.merchant_id)

  return (
    <DashboardContent 
      userName={user.email?.split('@')[0] || 'there'}
      merchantName={merchant?.name || 'Your Business'}
      storeCount={storeCount || 0}
    />
  )
}
