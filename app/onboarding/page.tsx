import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is not authenticated, redirect to login
  if (!session) {
    redirect('/login');
  }

  // Check if user already has a merchant account
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  // If user already has a merchant, redirect to dashboard
  if (merchantUser) {
    redirect('/dashboard');
  }

  // User is authenticated but doesn't have a merchant account yet
  return <OnboardingForm />;
}

