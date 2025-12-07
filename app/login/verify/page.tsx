import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import OtpVerificationForm from './OtpVerificationForm';

export default async function OtpVerificationPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is already authenticated, redirect
  if (session) {
    const { data: merchantUser } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (merchantUser) {
      redirect('/dashboard');
    } else {
      redirect('/get-started');
    }
  }

  // If no email provided, redirect to auth page
  if (!searchParams.email) {
      redirect('/login');
  }

  return <OtpVerificationForm email={searchParams.email} />;
}

