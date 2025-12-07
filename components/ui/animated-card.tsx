'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface AnimatedCardProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function AnimatedCard({ children, className }: AnimatedCardProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface AnimatedStatCardProps {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  delay?: number
}

export function AnimatedStatCard({ title, value, description, icon: Icon }: AnimatedStatCardProps) {
  return (
    <AnimatedCard>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-3xl font-bold mb-1">
            {value}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </CardContent>
      </Card>
    </AnimatedCard>
  )
}

