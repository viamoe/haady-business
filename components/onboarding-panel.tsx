'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2,
  Circle,
  ArrowRight,
  Store,
  Package,
  CreditCard,
  Truck,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useLocalizedUrl } from '@/lib/use-localized-url'

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  href: string
  icon: React.ElementType
}

interface OnboardingPanelProps {
  steps: OnboardingStep[]
  completedCount: number
  totalSteps: number
}

export function OnboardingPanel({ steps, completedCount, totalSteps }: OnboardingPanelProps) {
  const { localizedUrl } = useLocalizedUrl();
  const progress = (completedCount / totalSteps) * 100

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Complete Your Setup</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Finish setting up your business to start selling
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completedCount}/{totalSteps}</div>
            <div className="text-xs text-muted-foreground">completed</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}% complete
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {steps.map((step, index) => {
            // Check if href already has locale-country prefix
            const hasPrefix = /^\/[a-z]{2}-[a-z]{2}/i.test(step.href);
            const href = hasPrefix ? step.href : localizedUrl(step.href);
            
            return (
            <Link
              key={step.id}
              href={href}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/60 transition-colors group"
            >
              <div className="mt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-300">
                    <span className="text-xs font-medium text-gray-400">{index + 1}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <step.icon className={`h-4 w-4 shrink-0 ${step.completed ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <p className={`text-sm font-medium ${step.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {step.title}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
              {!step.completed && (
                <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              )}
            </Link>
            );
          })}
        </div>

        {/* Quick Action Button */}
        {completedCount < totalSteps && (
          <Button 
            asChild 
            className="w-full mt-4"
            variant={completedCount === 0 ? "default" : "outline"}
          >
            <Link href={localizedUrl(steps.find(s => !s.completed)?.href || '/dashboard')}>
              {completedCount === 0 ? 'Get Started' : 'Continue Setup'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

