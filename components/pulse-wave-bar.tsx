'use client'

interface PulseWaveBarProps {
  isActive?: boolean
  height?: number
}

export function PulseWaveBar({ isActive = false, height = 3 }: PulseWaveBarProps) {
  if (!isActive) return null

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 z-50 overflow-hidden"
      style={{ height: `${height}px` }}
    >
      <div className="relative h-full w-full">
        {/* Light orange layer - fast, one-way */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 140, 66, 0.4) 50%, transparent 100%)',
            backgroundSize: '50% 100%',
            animation: 'wave-fast 1.5s linear infinite',
          }}
        />
        
        {/* Orange layer - slower, bounces back and forth */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(244, 97, 11, 0.7) 50%, transparent 100%)',
            backgroundSize: '50% 100%',
            animation: 'wave-bounce 3s ease-in-out infinite alternate',
          }}
        />
        
        {/* Transparent gradient overlays at start and end */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            width: '15%', 
            left: 0,
            background: 'linear-gradient(to right, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%)'
          }} 
        />
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            width: '15%', 
            right: 0,
            background: 'linear-gradient(to left, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%)'
          }} 
        />
      </div>
    </div>
  )
}

