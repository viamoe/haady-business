import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth');
  }

  // Check if user has a business account
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
