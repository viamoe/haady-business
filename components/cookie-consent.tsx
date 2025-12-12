'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { setCookie, getCookie, COOKIE_NAMES, checkCookieConsent } from '@/lib/cookies';
import { useLocale } from '@/i18n/context';
import { X } from 'lucide-react';

const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_COOKIE_MAX_AGE = 31536000; // 1 year

interface CookieConsentProps {
  onConsentChange?: (consented: boolean) => void;
}

export function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, isRTL } = useLocale();

  useEffect(() => {
    // Check if user has already given consent
    const consent = getCookie(CONSENT_COOKIE_NAME);
    if (!consent) {
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setCookie(CONSENT_COOKIE_NAME, 'accepted', {
      maxAge: CONSENT_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'Lax',
    });
    setIsOpen(false);
    onConsentChange?.(true);
  };

  const handleDeny = () => {
    setCookie(CONSENT_COOKIE_NAME, 'denied', {
      maxAge: CONSENT_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'Lax',
    });
    // Clear all non-essential cookies if user denies
    clearNonEssentialCookies();
    setIsOpen(false);
    onConsentChange?.(false);
  };

  const clearNonEssentialCookies = () => {
    // Clear all cookies except essential ones (auth, consent)
    const essentialCookies = [
      CONSENT_COOKIE_NAME,
      'sb-access-token',
      'sb-refresh-token',
      COOKIE_NAMES.OAUTH_ORIGIN,
    ];

    // Get all cookies and clear non-essential ones
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((cookie) => {
        const cookieName = cookie.split('=')[0].trim();
        if (!essentialCookies.includes(cookieName)) {
          // Delete cookie by setting it to expire
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    }
  };

  const translations = {
    en: {
      title: 'Cookie Preferences',
      description: 'We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. You can choose to accept or deny non-essential cookies.',
      essential: 'Essential cookies are required for the website to function properly and cannot be disabled.',
      accept: 'Accept All',
      deny: 'Deny Non-Essential',
      learnMore: 'Learn More',
    },
    ar: {
      title: 'تفضيلات ملفات تعريف الارتباط',
      description: 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل استخدام الموقع والمساعدة في جهودنا التسويقية. يمكنك اختيار قبول أو رفض ملفات تعريف الارتباط غير الضرورية.',
      essential: 'ملفات تعريف الارتباط الأساسية مطلوبة لكي يعمل الموقع بشكل صحيح ولا يمكن تعطيلها.',
      accept: 'قبول الكل',
      deny: 'رفض غير الضرورية',
      learnMore: 'معرفة المزيد',
    },
  };

  const t = translations[locale];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className={`sm:max-w-[500px] ${isRTL ? 'text-right' : 'text-left'}`}
        aria-describedby="cookie-consent-description"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
            {t.title}
          </DialogTitle>
          <DialogDescription 
            id="cookie-consent-description"
            className={`mt-2 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {t.description}
          </DialogDescription>
        </DialogHeader>

        <div className={`mt-4 p-4 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm text-gray-600">
            {t.essential}
          </p>
        </div>

        <DialogFooter className={`gap-2 sm:gap-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            onClick={handleDeny}
            className="flex-1 sm:flex-initial"
          >
            {t.deny}
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 sm:flex-initial bg-black hover:bg-gray-900 text-white"
          >
            {t.accept}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Check if user has given cookie consent
 * Re-export from cookies utility for convenience
 */
export function hasCookieConsent(): boolean {
  return checkCookieConsent();
}

/**
 * Check if user has denied cookie consent
 */
export function hasCookieDenial(): boolean {
  const consent = getCookie(CONSENT_COOKIE_NAME);
  return consent === 'denied';
}

/**
 * Check if user has made a consent decision
 */
export function hasCookieConsentDecision(): boolean {
  const consent = getCookie(CONSENT_COOKIE_NAME);
  return consent === 'accepted' || consent === 'denied';
}

