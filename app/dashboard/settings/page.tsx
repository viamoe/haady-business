import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Redirect to store settings by default
export default async function SettingsPage() {
  redirect('/dashboard/settings/store')
}

