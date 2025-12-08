import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetupForm from './SetupForm';

export default async function SetupPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }
  
  // Check if user already has a merchant account
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('auth_user_id', user.id)
    .single();
  
  if (merchantUser) {
    // User already has a business, redirect to dashboard
    redirect('/dashboard');
  }
  
  return <SetupForm userEmail={user.email || ''} />;
}

