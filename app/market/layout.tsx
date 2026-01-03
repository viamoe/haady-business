import type { Metadata } from 'next'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Haady Market',
  description: 'Discover amazing gifts from local stores',
}

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-sidebar">
      {children}
    </div>
  )
}
