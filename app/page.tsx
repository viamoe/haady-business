import type { Metadata } from 'next';
import LandingPage from '@/components/landing-page';

export const metadata: Metadata = {
  title: 'Grow your business with Haady',
  description: 'The all-in-one platform to manage your stores, track sales, and scale your business effortlessly.',
};

export default function Home() {
  return <LandingPage />;
  }
