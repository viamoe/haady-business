'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}

