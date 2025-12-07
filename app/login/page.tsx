import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import AuthForm from './AuthForm';

export default async function AuthPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is authenticated, check if they have a business account
  if (session) {
    const { data: merchantUser } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (merchantUser) {
      redirect('/dashboard');
    } else {
      // User is authenticated but doesn't have a business account yet
      redirect('/get-started');
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthForm />
    </Suspense>
  );
}
