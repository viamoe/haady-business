import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import BusinessSetupForm from './BusinessSetupForm';

export default async function BusinessSetupPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Check if user already has a business account
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (merchantUser) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <BusinessSetupForm userId={session.user.id} userEmail={session.user.email || ''} />
    </div>
  );
}

