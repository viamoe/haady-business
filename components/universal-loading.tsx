'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { 
  Cloud,
  Package,
  Tag,
} from 'lucide-react'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

// Icons that will spread outward like the heart animation
const SAVING_ICONS = [
  { Icon: Cloud, index: 1 },
  { Icon: Package, index: 2 },
  { Icon: Tag, index: 3 },
]

interface UniversalLoadingProps {
  message?: string
  subMessage?: string
  className?: string
  /** When true, shows as a semi-transparent overlay instead of full white background */
  overlay?: boolean
}

export function UniversalLoading({ 
  message = 'Loading...', 
  subMessage,
  className,
  overlay = false,
}: UniversalLoadingProps) {
  return (
    <div className={cn(
      'fixed inset-0 z-[9999] flex items-center justify-center',
      overlay ? 'bg-white/60 backdrop-blur-sm' : 'bg-white',
      className
    )}>
      <div className="flex flex-col items-center gap-6">
        {/* Logo with spreading icons */}
        <div className="icon-spread-container">
          {/* Spreading Icons */}
          {SAVING_ICONS.map(({ Icon, index }) => (
            <div key={index} className={`icon-particle icon-particle-${index}`}>
              <Icon className="w-6 h-6 text-[#F4610B]" />
            </div>
          ))}
          
          {/* Center Logo */}
          <Image
            src={HAADY_LOGO_URL}
            alt="Haady"
            width={48}
            height={48}
            className="w-12 h-12 relative z-10 animate-heartbeat"
            priority
          />
        </div>

        {/* Shimmer Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="shimmer-text text-gray-900 font-semibold text-base text-center">
            {message}
          </p>
          {subMessage && (
            <p className="text-gray-400 text-sm text-center">
              {subMessage}
            </p>
          )}
        </div>
      </div>
      
      {/* CSS for spread animation - matching the heart spread style */}
      <style jsx>{`
        @keyframes iconSpread1 {
          0% { opacity: 1; transform: translate(0, 0) scale(0.6); }
          100% { opacity: 0; transform: translate(-40px, -40px) scale(1); }
        }
        @keyframes iconSpread2 {
          0% { opacity: 1; transform: translate(0, 0) scale(0.6); }
          100% { opacity: 0; transform: translate(40px, -40px) scale(1); }
        }
        @keyframes iconSpread3 {
          0% { opacity: 1; transform: translate(0, 0) scale(0.6); }
          100% { opacity: 0; transform: translate(0, 50px) scale(1); }
        }
        
        .icon-spread-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .icon-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          margin-left: -12px;
          margin-top: -12px;
          opacity: 0;
          pointer-events: none;
          z-index: 0;
        }
        
        .icon-particle-1 {
          animation: iconSpread1 1s ease-out infinite;
          animation-delay: 0s;
        }
        .icon-particle-2 {
          animation: iconSpread2 1s ease-out infinite;
          animation-delay: 0.25s;
        }
        .icon-particle-3 {
          animation: iconSpread3 1s ease-out infinite;
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  )
}

