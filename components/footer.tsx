'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { useLocalizedUrl } from '@/lib/use-localized-url';

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const t = useTranslations();
  const { isRTL, locale } = useLocale();
  const { localizedUrl } = useLocalizedUrl();
  const homeUrl = localizedUrl('/');

  return (
    <footer className={className ?? "border-t border-black/5 bg-[#F8F4EE]/60"}>
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p className="text-muted-foreground text-sm">
            {t('landing.footer.copyright')}
          </p>
          <div className={`flex flex-wrap gap-6 text-sm ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <Link href={`${homeUrl}#integrations`} className="text-muted-foreground hover:text-foreground transition-colors" suppressHydrationWarning>
              {t('landing.footer.links.integrations')}
            </Link>
            <Link href={localizedUrl('/changelog')} className="text-muted-foreground hover:text-foreground transition-colors" suppressHydrationWarning>
              {t('landing.footer.links.changelog')}
            </Link>
            <Link href={localizedUrl('/status')} className="text-muted-foreground hover:text-foreground transition-colors" suppressHydrationWarning>
              {t('landing.footer.links.status')}
            </Link>
            <Link href={localizedUrl('/terms')} className="text-muted-foreground hover:text-foreground transition-colors" suppressHydrationWarning>
              {t('landing.footer.links.terms')}
            </Link>
            <Link href={localizedUrl('/privacy')} className="text-muted-foreground hover:text-foreground transition-colors" suppressHydrationWarning>
              {t('landing.footer.links.privacy')}
            </Link>
            <Link href={localizedUrl('/support')} className="text-muted-foreground hover:text-foreground transition-colors" suppressHydrationWarning>
              {t('landing.footer.links.support')}
            </Link>
            <Link href={localizedUrl('/contact')} className="text-muted-foreground hover:text-foreground transition-colors" suppressHydrationWarning>
              {t('landing.footer.links.contact')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
