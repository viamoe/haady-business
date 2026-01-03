import { NextRequest, NextResponse } from 'next/server'

// Currency symbol mapping for fallback when SVG URLs fail
const CURRENCY_SYMBOLS: Record<string, string> = {
  'SAR': 'ر.س',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AED': 'د.إ',
  'KWD': 'د.ك',
  'BHD': '.د.ب',
  'OMR': 'ر.ع.',
  'QAR': 'ر.ق',
  'EGP': 'ج.م',
}

// Map currency icon URLs to currency codes for fallback
const URL_TO_CURRENCY: Record<string, string> = {
  'sama.gov.sa': 'SAR',
  'saudi': 'SAR',
  'riyal': 'SAR',
}

/**
 * Generate a simple SVG for currency symbol as fallback
 */
function generateCurrencySVG(symbol: string): string {
  // Escape HTML entities in symbol
  const escapedSymbol = symbol
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  
  // Simple, minimal SVG that works in all browsers
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <text x="12" y="18" font-family="system-ui, -apple-system, sans-serif" font-size="16" text-anchor="middle" fill="currentColor">${escapedSymbol}</text>
</svg>`
}

/**
 * API route to proxy currency icon SVGs
 * This bypasses CORS restrictions by fetching the SVG server-side
 * Falls back to generated SVG with currency symbol if external fetch fails
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  // Default fallback if no URL provided
  const defaultFallback = generateCurrencySVG('ر.س')

  if (!url) {
    return new NextResponse(defaultFallback, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // Validate URL to prevent SSRF attacks
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return new NextResponse(defaultFallback, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // Determine currency code from URL for fallback
  let currencyCode = 'SAR' // Default
  for (const [key, code] of Object.entries(URL_TO_CURRENCY)) {
    if (url.toLowerCase().includes(key.toLowerCase())) {
      currencyCode = code
      break
    }
  }
  const fallbackSymbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/svg+xml,image/*,*/*;q=0.8',
        'Referer': url.split('/').slice(0, 3).join('/'),
      },
      // Add timeout
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const content = await response.text()

    // Check if response is HTML (error page) instead of SVG
    if (content.trim().startsWith('<html') || content.includes('Request Rejected')) {
      throw new Error('Server returned HTML error page instead of SVG')
    }

    // Validate that we got SVG content
    if (!content.trim().startsWith('<svg') && !content.trim().startsWith('<?xml')) {
      throw new Error('Response is not valid SVG content')
    }

    // Return the SVG with proper headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    // If fetch fails, return a generated SVG with the currency symbol as fallback
    // Always return a valid SVG, never an error response
    console.warn(`Currency icon fetch failed for ${url}, using fallback symbol: ${fallbackSymbol}`, error?.message)
    
    try {
      const fallbackSVG = generateCurrencySVG(fallbackSymbol)
      
      return new NextResponse(fallbackSVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600', // Cache fallback for 1 hour
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (fallbackError) {
      // Even if fallback generation fails, return a minimal valid SVG
      const minimalSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <text x="12" y="18" font-family="system-ui" font-size="16" text-anchor="middle" fill="currentColor">$</text>
</svg>`
      
      return new NextResponse(minimalSVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  }
}

