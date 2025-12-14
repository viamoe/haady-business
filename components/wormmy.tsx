'use client'

import { useLocale } from '@/i18n/context'

interface WormmyProps {
  isActive?: boolean
}

export function Wormmy({ isActive = false }: WormmyProps) {
  const { isRTL } = useLocale()
  
  if (!isActive) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] z-50 overflow-hidden">
      <div 
        className={isRTL 
          ? "h-full w-1/4 bg-gradient-to-l from-transparent via-[#F4610B] via-[#FF8C42] to-transparent"
          : "h-full w-1/4 bg-gradient-to-r from-transparent via-[#F4610B] via-[#FF8C42] to-transparent"
        }
        style={{
          animation: isRTL 
            ? 'pingpong-rtl 3.75s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            : 'pingpong 3.75s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          willChange: 'transform',
        }}
      />
    </div>
  )
}

