'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Store, TrendingUp, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import { useLocalizedUrl } from '@/lib/use-localized-url';

export default function LandingPage() {
  const t = useTranslations();
  const { isRTL } = useLocale();
  const { localizedUrl } = useLocalizedUrl();
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            {t('landing.title')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            {t('landing.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>
                {t('landing.getStarted')}
                <ArrowRight className={isRTL ? 'mr-2 rotate-180' : 'ml-2'} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>{t('landing.learnMore')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            {t('landing.features.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.multiStore.title')}</CardTitle>
                <CardDescription>
                  {t('landing.features.multiStore.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.analytics.title')}</CardTitle>
                <CardDescription>
                  {t('landing.features.analytics.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.security.title')}</CardTitle>
                <CardDescription>
                  {t('landing.features.security.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.speed.title')}</CardTitle>
                <CardDescription>
                  {t('landing.features.speed.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.collaboration.title')}</CardTitle>
                <CardDescription>
                  {t('landing.features.collaboration.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.tools.title')}</CardTitle>
                <CardDescription>
                  {t('landing.features.tools.description')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-3xl md:text-4xl">
                {t('landing.readyToGrow')}
              </CardTitle>
              <CardDescription className="text-lg">
                {t('landing.joinThousands')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pt-6">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>
                  {t('landing.startFreeTrial')}
                  <ArrowRight className={isRTL ? 'mr-2 rotate-180' : 'ml-2'} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              {t('landing.footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <div className={`flex gap-6 mt-4 md:mt-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Link href={localizedUrl('/auth/signup')} className="text-sm text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('common.getStarted')}
              </Link>
              <Link href={localizedUrl('/auth/login')} className="text-sm text-muted-foreground hover:text-foreground" suppressHydrationWarning>
                {t('landing.footer.signIn')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

