'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useLocalizedUrl } from '@/lib/use-localized-url';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/i18n/context';
import { cn } from '@/lib/utils';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

interface LoadingOverlayProps {
  isLoading: boolean;
  className?: string;
}

export function LoadingOverlay({ isLoading, className }: LoadingOverlayProps) {
  const { user, loading: authLoading } = useAuth();
  const { localizedUrl } = useLocalizedUrl();
  const { isRTL } = useLocale();
  const t = useTranslations();

  if (!isLoading) return null;

  const showButton = !authLoading;
  const isAuthenticated = !!user;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-[#F4610B]/5 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Haady Logo with Heartbeat Animation */}
        <div className="animate-heartbeat">
          <Image
            src={HAADY_LOGO_URL}
            alt="Haady"
            width={64}
            height={64}
            className="w-16 h-16"
            priority
          />
        </div>

        {/* CTA Buttons - matches header CTA exactly */}
        {showButton && (
          <div className="flex items-center gap-3 mt-2">
            {isAuthenticated ? (
              <Button
                asChild
                size="lg"
                className="bg-black text-white hover:bg-orange-500 transition-colors"
              >
                <Link href={localizedUrl('/onboarding')} className="flex items-center gap-2">
                  <span>{t('landing.header.completeSetup')}</span>
                  <ArrowRight className={isRTL ? 'mr-2 rotate-180 h-4 w-4' : 'ml-2 h-4 w-4'} />
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                >
                  <Link href={localizedUrl('/auth/login')}>
                    {t('common.login')}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="bg-black text-white hover:bg-orange-500 transition-colors"
                >
                  <Link href={localizedUrl('/auth/signup')}>
                    {t('landing.header.cta.primary')}
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

