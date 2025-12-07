import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import AuthForm from '@/app/auth/AuthForm';

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not authenticated, show auth form on root page
  if (!session) {
    return <AuthForm />;
  }

  // If authenticated, redirect based on business setup status
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (merchantUser) {
    redirect('/dashboard');
  } else {
    redirect('/setup');
  }
}
