import { redirect } from 'next/navigation';

export default async function AuthPage() {
  // Redirect to unified setup page
  redirect('/setup');
}

