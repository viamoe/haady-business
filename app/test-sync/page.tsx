'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/lib/toast'

export default function TestSyncPage() {
  const [storeId, setStoreId] = useState('10425626')
  const [platform, setPlatform] = useState('salla')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    if (!storeId) {
      toast.error('Store ID is required')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/store-connections/sync-by-store-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeExternalId: storeId,
          platform: platform,
          type: 'all',
        }),
      })

      const data = await response.json()
      setResult(data)

      if (response.ok && data.success) {
        toast.success('Sync completed successfully!', {
          description: `Synced store ${storeId} on ${platform}`,
        })
      } else {
        toast.error('Sync failed', {
          description: data.error || data.message || 'Unknown error',
        })
      }
    } catch (error: any) {
      setResult({ error: error.message })
      toast.error('Sync error', {
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Sync Store by Store ID</CardTitle>
          <CardDescription>
            Sync products from a store using its platform store ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeId">Store External ID</Label>
            <Input
              id="storeId"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="10425626"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="salla">Salla</option>
              <option value="shopify">Shopify</option>
              <option value="zid">Zid</option>
            </select>
          </div>
          <Button
            onClick={handleSync}
            disabled={isLoading || !storeId}
            className="w-full"
          >
            {isLoading ? 'Syncing...' : 'Sync Store'}
          </Button>
          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

