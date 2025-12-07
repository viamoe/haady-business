import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import SetupWizard from './SetupWizard';

export default async function SetupPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check if user already has a business account
  if (session) {
    const { data: merchantUser } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (merchantUser) {
      redirect('/dashboard');
    }
  }

  return <SetupWizard initialSession={session} />;
}

