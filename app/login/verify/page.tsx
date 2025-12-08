import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import OtpVerificationForm from './OtpVerificationForm';

export default async function OtpVerificationPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const supabase = await createServerSupabase();
  
  // Use getUser() instead of getSession() for security - verifies with Supabase Auth server
  const { data: { user }, error } = await supabase.auth.getUser();

  // If user is already authenticated, redirect
  if (!error && user) {
    const { data: merchantUser } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', user.id)
      .single();

    if (merchantUser) {
      redirect('/dashboard');
    } else {
      redirect('/setup');
    }
  }

  // If no email provided, redirect to auth page
  if (!searchParams.email) {
      redirect('/login');
  }

  return <OtpVerificationForm email={searchParams.email} />;
}

