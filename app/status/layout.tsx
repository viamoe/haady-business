import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Status | Haady',
  description: 'Real-time status of all Haady platform services, uptime statistics, and incident history.',
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
