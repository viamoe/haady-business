'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { setCookie, getCookie, COOKIE_NAMES, checkCookieConsent } from '@/lib/cookies';
import { useLocale } from '@/i18n/context';
import { cn } from '@/lib/utils';
import { Cookie } from 'lucide-react';

const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_COOKIE_MAX_AGE = 31536000; // 1 year

interface CookieConsentProps {
  onConsentChange?: (consented: boolean) => void;
}

export function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { locale, isRTL } = useLocale();

  useEffect(() => {
    // Check if user has already given consent
    const consent = getCookie(CONSENT_COOKIE_NAME);
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
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
    handleClose();
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
    handleClose();
    onConsentChange?.(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
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
      description: 'We use cookies to enhance your experience. You can accept or deny non-essential cookies.',
      accept: 'Accept All',
      deny: 'Deny',
    },
    ar: {
      description: 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك قبول أو رفض ملفات تعريف الارتباط غير الضرورية.',
      accept: 'قبول الكل',
      deny: 'رفض',
    },
  };

  const t = translations[locale];

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 bottom-0 z-[150] px-4 py-4',
        'bg-gray-100 shadow-lg',
        'animate-in slide-in-from-bottom duration-300',
        isClosing && 'animate-out slide-out-to-bottom duration-300'
      )}
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="container mx-auto max-w-7xl">
        <div className={cn(
          'flex items-center justify-between gap-4',
          isRTL ? 'flex-row-reverse' : 'flex-row'
        )}>
          {/* Left side - Icon and Description */}
          <div className={cn(
            'flex items-center gap-3 flex-1 min-w-0',
            isRTL ? 'flex-row-reverse' : 'flex-row'
          )}>
            <Cookie className="h-5 w-5 text-gray-700 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p
                id="cookie-consent-description"
                className={cn(
                  'text-base text-gray-700',
                  isRTL ? 'text-right' : 'text-left'
                )}
              >
                {t.description}
              </p>
            </div>
          </div>

          {/* Right side - Buttons */}
          <div className={cn(
            'flex items-center gap-2 flex-shrink-0',
            isRTL ? 'flex-row-reverse' : 'flex-row'
          )}>
            <Button
              variant="outline"
              onClick={handleDeny}
              size="sm"
              className="h-9 px-4 text-base"
            >
              {t.deny}
            </Button>
            <Button
              onClick={handleAccept}
              size="sm"
              className="h-9 px-4 text-base bg-black hover:bg-gray-900 text-white"
            >
              {t.accept}
            </Button>
          </div>
        </div>
      </div>
    </div>
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

