'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { getLocalizedUrl } from '@/lib/localized-url';

export function SignOutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    const homeUrl = getLocalizedUrl('/', pathname);
    router.push(homeUrl);
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

