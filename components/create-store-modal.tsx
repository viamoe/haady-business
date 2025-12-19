'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Store, Loader2, MapPin, Building2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'

interface CreateStoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateStoreModal({
  open,
  onOpenChange,
}: CreateStoreModalProps) {
  const t = useTranslations()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [storeType, setStoreType] = useState<'online' | 'retail' | 'hybrid' | 'pop_up'>('online')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Auto-generate slug from name
  useEffect(() => {
    if (name) {
      const generatedSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50)
      setSlug(generatedSlug)
    } else {
      setSlug('')
    }
  }, [name])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setName('')
      setSlug('')
      setStoreType('online')
      setCountry('')
      setCity('')
      setAddress('')
      setMinimumOrderAmount('')
      setDescription('')
    }
  }, [open])

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (open && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('onboarding.createStoreModal.errors.nameRequired') || 'Store name is required', {
        description: t('onboarding.createStoreModal.errors.pleaseEnterName') || 'Please enter a store name.',
      })
      return
    }

    if (!slug.trim()) {
      toast.error(t('onboarding.createStoreModal.errors.slugRequired') || 'Store slug is required', {
        description: t('onboarding.createStoreModal.errors.pleaseEnterSlug') || 'Please enter a store slug.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          store_type: storeType,
          country: country.trim() || undefined,
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          minimum_order_amount: minimumOrderAmount ? parseFloat(minimumOrderAmount) : undefined,
          description: description.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('onboarding.createStoreModal.errors.createFailed') || 'Failed to create store')
      }

      toast.success(t('onboarding.createStoreModal.success.title') || 'Store created successfully', {
        description: t('onboarding.createStoreModal.success.description', { name: name.trim() }) || `The store "${name.trim()}" has been created.`,
      })

      onOpenChange(false)
      
      // Refresh the page to show the new store
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to create store:', error)
      toast.error(t('onboarding.createStoreModal.errors.createFailed') || 'Failed to create store', {
        description: error.message || t('onboarding.createStoreModal.errors.tryAgain') || 'An error occurred while creating the store. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const storeTypeConfig: Record<string, { label: string }> = {
    online: { label: t('onboarding.createStoreModal.storeTypes.online') || 'Online' },
    retail: { label: t('onboarding.createStoreModal.storeTypes.retail') || 'Retail' },
    hybrid: { label: t('onboarding.createStoreModal.storeTypes.hybrid') || 'Hybrid' },
    pop_up: { label: t('onboarding.createStoreModal.storeTypes.popUp') || 'Pop-up' },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[calc(100vh-4rem)] bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col overflow-hidden">
        <DialogHeader className="text-left space-y-1.5 mb-6 flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            {t('onboarding.createStoreModal.title') || 'Create New Store'}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-500">
            {t('onboarding.createStoreModal.description') || 'Create a new Haady store. Required fields are marked with an asterisk.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-custom pr-2">
          <div className="space-y-6">
            {/* Store Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('onboarding.createStoreModal.fields.name') || 'Store Name'} <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={nameInputRef}
                id="name"
                type="text"
                placeholder={t('onboarding.createStoreModal.placeholders.name') || 'My Store'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {t('onboarding.createStoreModal.helpText.name') || 'The display name of the store.'}
              </p>
            </div>

            {/* Store Slug - Required */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                {t('onboarding.createStoreModal.fields.slug') || 'Store Slug'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                type="text"
                placeholder={t('onboarding.createStoreModal.placeholders.slug') || 'my-store'}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {t('onboarding.createStoreModal.helpText.slug') || 'URL-friendly identifier. Auto-generated from name, but can be customized. Must be unique.'}
              </p>
            </div>

            {/* Store Type */}
            <div className="space-y-2">
              <Label htmlFor="storeType">{t('onboarding.createStoreModal.fields.storeType') || 'Store Type'}</Label>
              <Select 
                value={storeType} 
                onValueChange={(value) => setStoreType(value as 'online' | 'retail' | 'hybrid' | 'pop_up')} 
                disabled={isSubmitting}
              >
                <SelectTrigger id="storeType">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>{storeTypeConfig[storeType].label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>{t('onboarding.createStoreModal.storeTypes.online') || 'Online'}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="retail">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>{t('onboarding.createStoreModal.storeTypes.retail') || 'Retail'}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>{t('onboarding.createStoreModal.storeTypes.hybrid') || 'Hybrid'}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pop_up">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>{t('onboarding.createStoreModal.storeTypes.popUp') || 'Pop-up'}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('onboarding.createStoreModal.helpText.storeType') || 'The type of store operation.'}
              </p>
            </div>

            {/* Location Fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">{t('onboarding.createStoreModal.fields.country') || 'Country'}</Label>
                <Input
                  id="country"
                  type="text"
                  placeholder={t('onboarding.createStoreModal.placeholders.country') || 'United States'}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">{t('onboarding.createStoreModal.fields.city') || 'City'}</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder={t('onboarding.createStoreModal.placeholders.city') || 'New York'}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">{t('onboarding.createStoreModal.fields.address') || 'Address'}</Label>
              <Input
                id="address"
                type="text"
                placeholder={t('onboarding.createStoreModal.placeholders.address') || '123 Main Street'}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Minimum Order Amount */}
            <div className="space-y-2">
              <Label htmlFor="minimumOrderAmount">{t('onboarding.createStoreModal.fields.minimumOrderAmount') || 'Minimum Order Amount'}</Label>
              <Input
                id="minimumOrderAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={minimumOrderAmount}
                onChange={(e) => setMinimumOrderAmount(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {t('onboarding.createStoreModal.helpText.minimumOrderAmount') || 'Optional. Minimum order amount in the store\'s currency.'}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('onboarding.createStoreModal.fields.description') || 'Description'}</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                placeholder={t('onboarding.createStoreModal.placeholders.description') || 'Store description...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {t('onboarding.createStoreModal.helpText.description') || 'Optional. Brief description of the store.'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-end gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isSubmitting}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !name.trim() || !slug.trim()}
              className="bg-[#F4610B] hover:bg-[#F4610B]/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('onboarding.createStoreModal.creating') || 'Creating...'}
                </>
              ) : (
                <>
                  <Store className="h-4 w-4 mr-2" />
                  {t('onboarding.createStoreModal.createButton') || 'Create Store'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

