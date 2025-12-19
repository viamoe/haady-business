'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLocale } from '@/i18n/context'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [workingRange, setWorkingRange] = React.useState<DateRange | undefined>(dateRange)
  const { locale, isRTL } = useLocale()
  const t = useTranslations()
  const dateLocale = locale === 'ar' ? ar : enUS

  // Update working range when dateRange prop changes or popover opens
  React.useEffect(() => {
    if (open) {
      setWorkingRange(dateRange)
    }
  }, [open, dateRange])

  const formatDateRange = (range: DateRange | undefined): string => {
    if (!range?.from) {
      return t('dashboard.dateRange.selectRange')
    }
    
    if (range.from && !range.to) {
      return format(range.from, 'MMM d, yyyy', { locale: dateLocale })
    }
    
    if (range.from && range.to) {
      return `${format(range.from, 'MMM d', { locale: dateLocale })} - ${format(range.to, 'MMM d, yyyy', { locale: dateLocale })}`
    }
    
    return t('dashboard.dateRange.selectRange')
  }

  const getPresetRange = (preset: string): DateRange => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (preset) {
      case 'today':
        return { from: today, to: today }
      case 'thisWeek': {
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(today)
        // Calculate days to subtract: Monday = 0, Tuesday = 1, ..., Sunday = 6
        // If Sunday (0), go back 6 days to get Monday, otherwise subtract (dayOfWeek - 1)
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startOfWeek.setDate(today.getDate() - daysToSubtract)
        return { from: startOfWeek, to: today }
      }
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: startOfMonth, to: today }
      }
      case 'thisQuarter': {
        const quarter = Math.floor(now.getMonth() / 3)
        const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1)
        return { from: startOfQuarter, to: today }
      }
      case 'thisYear': {
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        return { from: startOfYear, to: today }
      }
      case 'lastWeek': {
        const dayOfWeek = now.getDay()
        const endOfLastWeek = new Date(today)
        endOfLastWeek.setDate(today.getDate() - dayOfWeek - 1)
        const startOfLastWeek = new Date(endOfLastWeek)
        startOfLastWeek.setDate(endOfLastWeek.getDate() - 6)
        return { from: startOfLastWeek, to: endOfLastWeek }
      }
      case 'lastMonth': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        return { from: startOfLastMonth, to: endOfLastMonth }
      }
      case 'lastQuarter': {
        const quarter = Math.floor(now.getMonth() / 3)
        const lastQuarter = quarter === 0 ? 3 : quarter - 1
        const startOfLastQuarter = new Date(now.getFullYear(), lastQuarter * 3, 1)
        const endOfLastQuarter = new Date(now.getFullYear(), (lastQuarter + 1) * 3, 0)
        return { from: startOfLastQuarter, to: endOfLastQuarter }
      }
      default:
        return { from: today, to: today }
    }
  }

  const handlePresetClick = (preset: string) => {
    const range = getPresetRange(preset)
    setWorkingRange(range)
    // Don't apply immediately - wait for confirm
  }

  const handleConfirm = () => {
    onDateRangeChange?.(workingRange)
    setOpen(false)
  }

  const handleCancel = () => {
    setWorkingRange(dateRange)
    setOpen(false)
  }

  // Helper to compare dates (ignoring time)
  const compareDates = React.useCallback((date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }, [])

  // Check if workingRange matches a preset
  const matchesPreset = React.useCallback((preset: string): boolean => {
    if (!workingRange?.from || !workingRange?.to) return false
    const presetRange = getPresetRange(preset)
    if (!presetRange?.from || !presetRange?.to) return false
    return compareDates(workingRange.from, presetRange.from) && compareDates(workingRange.to, presetRange.to)
  }, [workingRange, compareDates])

  // Detect which preset matches the current date range
  const presetLabel = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Today - hide badge for today (default)
    if (compareDates(dateRange.from, today) && compareDates(dateRange.to, today)) {
      return null
    }

    // This week
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(today)
    // Calculate days to subtract: Monday = 0, Tuesday = 1, ..., Sunday = 6
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(today.getDate() - daysToSubtract)
    if (compareDates(dateRange.from, startOfWeek) && compareDates(dateRange.to, today)) {
      return t('dashboard.dateRange.thisWeek')
    }

    // This month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    if (compareDates(dateRange.from, startOfMonth) && compareDates(dateRange.to, today)) {
      return t('dashboard.dateRange.thisMonth')
    }

    // This quarter
    const quarter = Math.floor(now.getMonth() / 3)
    const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1)
    if (compareDates(dateRange.from, startOfQuarter) && compareDates(dateRange.to, today)) {
      return t('dashboard.dateRange.thisQuarter')
    }

    // This year
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    if (compareDates(dateRange.from, startOfYear) && compareDates(dateRange.to, today)) {
      return t('dashboard.dateRange.thisYear')
    }

    // Last week
    const endOfLastWeek = new Date(today)
    endOfLastWeek.setDate(today.getDate() - dayOfWeek - 1)
    const startOfLastWeek = new Date(endOfLastWeek)
    startOfLastWeek.setDate(endOfLastWeek.getDate() - 6)
    if (compareDates(dateRange.from, startOfLastWeek) && compareDates(dateRange.to, endOfLastWeek)) {
      return t('dashboard.dateRange.lastWeek')
    }

    // Last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    if (compareDates(dateRange.from, startOfLastMonth) && compareDates(dateRange.to, endOfLastMonth)) {
      return t('dashboard.dateRange.lastMonth')
    }

    // Last quarter
    const lastQuarter = quarter === 0 ? 3 : quarter - 1
    const startOfLastQuarter = new Date(now.getFullYear(), lastQuarter * 3, 1)
    const endOfLastQuarter = new Date(now.getFullYear(), (lastQuarter + 1) * 3, 0)
    if (compareDates(dateRange.from, startOfLastQuarter) && compareDates(dateRange.to, endOfLastQuarter)) {
      return t('dashboard.dateRange.lastQuarter')
    }

    return null
  }, [dateRange, t, compareDates])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-10 px-4 font-normal border-0 rounded-lg transition-colors',
            presetLabel 
              ? 'bg-[#F4610B]/5 hover:bg-[#F4610B]/10 text-[#F4610B]' 
              : 'bg-gray-50 hover:bg-[#F4610B]/5',
            !dateRange && !presetLabel && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-[#F4610B]" />
          <span className={cn('flex-1', isRTL ? 'text-right' : 'text-left')}>
            {formatDateRange(dateRange)}
          </span>
          {presetLabel && (
            <Badge 
              variant="secondary" 
              className="ml-2 bg-[#F4610B]/15 text-[#F4610B] border-0 hover:bg-[#F4610B]/20 text-xs font-medium flex items-center gap-1.5 px-2 py-1"
            >
              <span>{presetLabel}</span>
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  const today = new Date()
                  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                  onDateRangeChange?.({ from: todayDate, to: todayDate })
                }}
                className="ml-0.5 h-4 w-4 flex items-center justify-center transition-colors cursor-pointer hover:opacity-70"
                role="button"
                tabIndex={0}
                aria-label="Reset to today"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    const today = new Date()
                    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                    onDateRangeChange?.({ from: todayDate, to: todayDate })
                  }
                }}
              >
                <X className="h-2.5 w-2.5 text-[#F4610B]" />
              </div>
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={isRTL ? 'end' : 'start'}
        sideOffset={12}
        className={cn(
          "max-w-[90vw] border-0 p-0 rounded-3xl overflow-hidden bg-white w-fit transform",
          isRTL ? "mr-2 translate-x-8" : "ml-2 -translate-x-8"
        )}
        style={{
          boxShadow: '0 25px 60px rgba(15, 23, 42, 0.12)'
        }}
      >
        <div className={cn("flex", isRTL && "flex-row-reverse")}>
          <div className={cn(
            "p-5 w-[200px] flex-shrink-0 bg-gray-50",
            isRTL ? "border-l border-gray-100" : "border-r border-gray-100"
          )}>
            <h3 className={cn(
              "text-sm font-semibold text-gray-900 mb-4",
              isRTL && "text-right"
            )}>
              {t('dashboard.dateRange.quickPresets')}
            </h3>
            <div className="space-y-1.5">
              {(['today', 'thisWeek', 'thisMonth', 'thisQuarter', 'thisYear', 'lastWeek', 'lastMonth', 'lastQuarter'] as const).map((preset) => {
                const isSelected = matchesPreset(preset)
                const presetLabels: Record<typeof preset, string> = {
                  today: t('dashboard.dateRange.today'),
                  thisWeek: t('dashboard.dateRange.thisWeek'),
                  thisMonth: t('dashboard.dateRange.thisMonth'),
                  thisQuarter: t('dashboard.dateRange.thisQuarter'),
                  thisYear: t('dashboard.dateRange.thisYear'),
                  lastWeek: t('dashboard.dateRange.lastWeek'),
                  lastMonth: t('dashboard.dateRange.lastMonth'),
                  lastQuarter: t('dashboard.dateRange.lastQuarter'),
                }
                return (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "w-full text-sm py-2 px-3 rounded-2xl transition-all duration-150",
                      isRTL ? "text-right" : "text-left",
                      isSelected
                        ? "bg-[#F4610B]/15 text-[#F4610B] font-semibold"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    {presetLabels[preset]}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col bg-white flex-1">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={workingRange?.from || dateRange?.from}
              selected={workingRange}
              onSelect={(range) => {
                // Allow manual selection: first click sets start, second click sets end
                // If clicking on the same date that's already selected (both from and to are the same), deselect it
                if (range?.from && workingRange?.from && workingRange?.to &&
                    range.from.getTime() === workingRange.from.getTime() &&
                    range.from.getTime() === workingRange.to.getTime() &&
                    !range.to) {
                  // Clicking on a complete range (same start and end) clears it
                  setWorkingRange(undefined)
                } else if (range?.from && !range.to && workingRange?.from && workingRange?.to) {
                  // If a range is already selected and user clicks a new date, start a new selection
                  setWorkingRange({ from: range.from, to: undefined })
                } else {
                  // Normal range selection behavior
                  setWorkingRange(range)
                }
              }}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 mt-auto">
              <div className={cn(
                "flex items-center justify-end gap-3",
                isRTL && "flex-row-reverse"
              )}>
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  className="h-10 rounded-2xl bg-white text-gray-600 hover:bg-gray-100 px-6"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="h-10 rounded-2xl bg-[#F4610B] hover:bg-[#F4610B]/90 text-white font-semibold px-6"
                >
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
