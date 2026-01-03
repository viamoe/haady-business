'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface BreadcrumbItem {
  label: string
  href?: string
  isLoading?: boolean
  onClick?: (e: React.MouseEvent) => void // Custom click handler to intercept navigation
}

interface HeaderContent {
  title?: string
  count?: number
  countLabel?: string
  leftActions?: ReactNode
  rightActions?: ReactNode
  searchPlaceholder?: string
  onSearch?: (value: string) => void
  searchValue?: string
  breadcrumbs?: BreadcrumbItem[]
  hasUnsavedChanges?: boolean
}

interface HeaderContextType {
  headerContent: HeaderContent | null
  setHeaderContent: (content: HeaderContent | null) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerContent, setHeaderContent] = useState<HeaderContent | null>(null)

  return (
    <HeaderContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  const context = useContext(HeaderContext)
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider')
  }
  return context
}

