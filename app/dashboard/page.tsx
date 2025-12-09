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

  // Check if user has completed setup and get user details
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!merchantUser?.merchant_id) {
    redirect('/setup')
  }

  // Extract first name from full_name
  const getFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return user.email?.split('@')[0] || 'there'
    const nameParts = fullName.trim().split(/\s+/)
    return nameParts[0] || user.email?.split('@')[0] || 'there'
  }

  const firstName = getFirstName(merchantUser.full_name)

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

  // Get product count
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantUser.merchant_id)

  // Check setup completion status
  const hasStore = (storeCount || 0) > 0
  const hasProducts = (productCount || 0) > 0
  // TODO: Check payment methods and shipping configuration when those features are implemented
  const hasPaymentConfigured = false // Placeholder
  const hasShippingConfigured = false // Placeholder

  const isSetupComplete = hasStore && hasProducts && hasPaymentConfigured && hasShippingConfigured

  return (
    <DashboardContent 
      userName={firstName}
      merchantName={merchant?.name || 'Your Business'}
      storeCount={storeCount || 0}
      productCount={productCount || 0}
      hasStore={hasStore}
      hasProducts={hasProducts}
      hasPaymentConfigured={hasPaymentConfigured}
      hasShippingConfigured={hasShippingConfigured}
      isSetupComplete={isSetupComplete}
    />
  )
}
