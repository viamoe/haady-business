'use client'

import { useEffect, useRef } from 'react'

export function OnboardingGraphics() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const imageLoadedRef = useRef(false)
  const mousePositionRef = useRef({ x: 0.5, y: 0.5 })
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Mouse tracking for parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      targetMouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      }
    }

    const handleMouseLeave = () => {
      // Return to center when mouse leaves
      targetMouseRef.current = { x: 0.5, y: 0.5 }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    // Load the background image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = '/assets/Rainbow_Handbag_Display-8a341ae0-6f46-4c73-b98f-82920b2c9b2f.png'
    img.onload = () => {
      imageRef.current = img
      imageLoadedRef.current = true
    }
    img.onerror = () => {
      console.warn('Failed to load background image')
    }

    // Set canvas size to fill container
    const resizeCanvas = () => {
      // Get the actual container (the flex-1 div)
      const container = canvas.parentElement
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const displayWidth = rect.width
      const displayHeight = rect.height
      
      // Set internal canvas size (for drawing)
      canvas.width = displayWidth * dpr
      canvas.height = displayHeight * dpr
      
      // Set display size (CSS) - fill the container
      canvas.style.width = displayWidth + 'px'
      canvas.style.height = displayHeight + 'px'
      
      // Scale context for high DPI
      ctx.scale(dpr, dpr)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Animation state
    let time = 0
    const speed = 0.0003

    // Create noise texture (generate once, reuse)
    const noiseSize = 256 // Fixed size for noise texture
    const createNoise = (size: number) => {
      const noiseCanvas = document.createElement('canvas')
      noiseCanvas.width = size
      noiseCanvas.height = size
      const noiseCtx = noiseCanvas.getContext('2d')
      if (!noiseCtx) return null
      
      const imageData = noiseCtx.createImageData(size, size)
      // Pink color values (E2648B = rgb(226, 100, 139))
      const pinkR = 226
      const pinkG = 100
      const pinkB = 139
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const intensity = Math.random() // 0 to 1
        imageData.data[i] = pinkR * intensity     // R
        imageData.data[i + 1] = pinkG * intensity // G
        imageData.data[i + 2] = pinkB * intensity // B
        imageData.data[i + 3] = 80   // A (opacity for film grain)
      }
      noiseCtx.putImageData(imageData, 0, 0)
      return noiseCanvas
    }

    const noiseCanvas = createNoise(noiseSize)

    const animate = () => {
      time += speed
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      
      // Ensure canvas internal size matches display size
      if (canvas.width !== width * window.devicePixelRatio || canvas.height !== height * window.devicePixelRatio) {
        resizeCanvas()
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Smooth mouse position interpolation for parallax
      mousePositionRef.current.x += (targetMouseRef.current.x - mousePositionRef.current.x) * 0.1
      mousePositionRef.current.y += (targetMouseRef.current.y - mousePositionRef.current.y) * 0.1

      // Draw background image if loaded
      if (imageLoadedRef.current && imageRef.current) {
        // Calculate aspect ratio and draw image to fill canvas while maintaining aspect ratio
        const img = imageRef.current
        const imgAspect = img.width / img.height
        const canvasAspect = width / height
        
        let drawWidth = width
        let drawHeight = height
        let baseOffsetX = 0
        let baseOffsetY = 0
        
        if (imgAspect > canvasAspect) {
          // Image is wider - fit to height
          drawHeight = height
          drawWidth = height * imgAspect
          baseOffsetX = (width - drawWidth) / 2
        } else {
          // Image is taller - fit to width
          drawWidth = width
          drawHeight = width / imgAspect
          baseOffsetY = (height - drawHeight) / 2
        }
        
        // Calculate pan camera effect (image moves with mouse like panning a camera)
        const panStrength = 80 // pixels of maximum pan movement
        const mouseX = mousePositionRef.current.x
        const mouseY = mousePositionRef.current.y
        
        // Calculate how much extra image we have to pan (difference between image size and canvas)
        const extraWidth = Math.max(0, drawWidth - width)
        const extraHeight = Math.max(0, drawHeight - height)
        
        // Normalize mouse position from 0-1 to -1 to 1, then apply pan
        // When mouse is at left edge (0), pan left (negative offset)
        // When mouse is at right edge (1), pan right (positive offset)
        const panX = (mouseX - 0.5) * 2 * extraWidth * 0.5
        const panY = (mouseY - 0.5) * 2 * extraHeight * 0.5
        
        // Apply pan offset to base position
        const offsetX = baseOffsetX + panX
        const offsetY = baseOffsetY + panY
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
      } else {
        // Fallback gradient while image loads
        const fallbackGradient = ctx.createLinearGradient(0, 0, width, height)
        fallbackGradient.addColorStop(0, '#ff62c7')
        fallbackGradient.addColorStop(0.45, '#7a46ff')
        fallbackGradient.addColorStop(0.70, '#2b2bb6')
        fallbackGradient.addColorStop(1, '#ff70d5')
        ctx.fillStyle = fallbackGradient
        ctx.fillRect(0, 0, width, height)
      }

      // Subtle vignette overlay
      const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.6)
      vignette.addColorStop(0.45, 'transparent')
      vignette.addColorStop(1, 'rgba(0,0,0,.15)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)

      // Apply grain (SVG noise - fractal turbulence) with overlay blend
      if (noiseCanvas) {
        const noiseOffsetX = (time * 50) % noiseSize
        const noiseOffsetY = (time * 40) % noiseSize

        // Draw tiled noise with offset for seamless scrolling
        ctx.globalAlpha = 0.30
        ctx.globalCompositeOperation = 'overlay'
        
        // Tile the noise across the canvas (240px size as per CSS)
        const grainSize = 240
        const tilesX = Math.ceil(width / grainSize) + 1
        const tilesY = Math.ceil(height / grainSize) + 1
        
        for (let x = -1; x < tilesX; x++) {
          for (let y = -1; y < tilesY; y++) {
            ctx.drawImage(
              noiseCanvas,
              x * grainSize - noiseOffsetX,
              y * grainSize - noiseOffsetY
            )
          }
        }
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ 
        imageRendering: 'auto',
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  )
}
