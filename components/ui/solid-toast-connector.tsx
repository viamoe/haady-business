'use client'

import { useEffect } from 'react'
import { useSolidToast, setGlobalToast } from './solid-toast'

export function SolidToastConnector() {
  const { showToast } = useSolidToast()

  useEffect(() => {
    setGlobalToast(showToast)
  }, [showToast])

  return null
}

