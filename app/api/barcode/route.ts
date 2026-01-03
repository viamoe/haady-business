import { NextResponse } from 'next/server'
import * as bwipjs from 'bwip-js'

const ENCODER_MAP: Record<string, string> = {
  'EAN13': 'ean13',
  'EAN8': 'ean8',
  'UPC-A': 'upca',
  'CODE128': 'code128',
  'QR': 'qrcode',
  'DATAMATRIX': 'datamatrix',
}

/**
 * GET /api/barcode
 * Generate barcode image
 * 
 * Query params:
 * - value: barcode value (required)
 * - type: barcode type (default: EAN13)
 * - format: output format - png or svg (default: png)
 * - scale: scale factor 1-10 (default: 3)
 * - height: height in mm (default: 15)
 * - includeText: show human-readable text (default: true)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const value = searchParams.get('value')
    const type = searchParams.get('type') || 'EAN13'
    const format = searchParams.get('format') || 'png'
    const scale = parseInt(searchParams.get('scale') || '3', 10)
    const height = parseInt(searchParams.get('height') || '15', 10)
    const width = searchParams.get('width') ? parseInt(searchParams.get('width')!, 10) : undefined
    const includeText = searchParams.get('includeText') !== 'false'
    
    const isQR = type.toUpperCase() === 'QR' || type.toUpperCase() === 'DATAMATRIX'

    if (!value) {
      return NextResponse.json(
        { error: 'Missing required parameter: value' },
        { status: 400 }
      )
    }

    const encoder = ENCODER_MAP[type.toUpperCase()]
    if (!encoder) {
      return NextResponse.json(
        { error: `Unsupported barcode type: ${type}. Supported types: ${Object.keys(ENCODER_MAP).join(', ')}` },
        { status: 400 }
      )
    }

    // Validate barcode value based on type
    const validation = validateBarcodeValue(value, type.toUpperCase())
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const bwipOptions: bwipjs.RenderOptions = {
      bcid: encoder,
      text: value,
      scale: Math.min(10, Math.max(1, scale)),
      includetext: !isQR && includeText,
      textxalign: 'center',
      backgroundcolor: 'FFFFFF',
      barcolor: '000000',
    }
    
    // For QR codes, don't set width/height - let scale determine the size (always square)
    // For linear barcodes, set height
    if (!isQR) {
      bwipOptions.height = height
    }

    // Use toBuffer for both formats (SVG not supported in newer bwip-js versions)
    const png = await bwipjs.toBuffer(bwipOptions)
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error: any) {
    console.error('Error generating barcode:', error)
    return NextResponse.json(
      { error: 'Failed to generate barcode', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/barcode
 * Generate barcode with more options
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      value,
      type = 'EAN13',
      format = 'png',
      scale = 3,
      height = 15,
      width,
      includeText = true,
      backgroundColor = 'FFFFFF',
      barcodeColor = '000000',
      rotate,
    } = body

    if (!value) {
      return NextResponse.json(
        { error: 'Missing required field: value' },
        { status: 400 }
      )
    }

    const encoder = ENCODER_MAP[type.toUpperCase()]
    if (!encoder) {
      return NextResponse.json(
        { error: `Unsupported barcode type: ${type}` },
        { status: 400 }
      )
    }

    const validation = validateBarcodeValue(value, type.toUpperCase())
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const isQR = type.toUpperCase() === 'QR' || type.toUpperCase() === 'DATAMATRIX'

    const bwipOptions: bwipjs.RenderOptions = {
      bcid: encoder,
      text: value,
      scale: Math.min(10, Math.max(1, scale)),
      includetext: !isQR && includeText,
      textxalign: 'center',
      backgroundcolor: backgroundColor.replace('#', ''),
      barcolor: barcodeColor.replace('#', ''),
    }

    // For QR codes, don't set width/height - let scale determine the size (always square)
    // For linear barcodes, set height
    if (!isQR) {
      bwipOptions.height = height
      if (width) {
        bwipOptions.width = width
      }
    }

    if (rotate) {
      bwipOptions.rotate = rotate
    }

    // Use toBuffer (SVG not supported in newer bwip-js versions, always return PNG)
    const png = await bwipjs.toBuffer(bwipOptions)
    
    // Return as base64 data URL
    if (body.returnDataUrl) {
      const base64 = png.toString('base64')
      return NextResponse.json({
        dataUrl: `data:image/png;base64,${base64}`,
        type: type,
        value: value,
      })
    }
    
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
      },
    })
  } catch (error: any) {
    console.error('Error generating barcode:', error)
    return NextResponse.json(
      { error: 'Failed to generate barcode', details: error.message },
      { status: 500 }
    )
  }
}

function validateBarcodeValue(value: string, type: string): { valid: boolean; error?: string } {
  switch (type) {
    case 'EAN13':
      if (!/^\d{13}$/.test(value)) {
        return { valid: false, error: 'EAN-13 must be exactly 13 digits' }
      }
      break
    case 'EAN8':
      if (!/^\d{8}$/.test(value)) {
        return { valid: false, error: 'EAN-8 must be exactly 8 digits' }
      }
      break
    case 'UPC-A':
      if (!/^\d{12}$/.test(value)) {
        return { valid: false, error: 'UPC-A must be exactly 12 digits' }
      }
      break
    case 'CODE128':
      if (value.length === 0 || value.length > 80) {
        return { valid: false, error: 'Code 128 must be 1-80 characters' }
      }
      break
    case 'QR':
    case 'DATAMATRIX':
      if (value.length === 0 || value.length > 4296) {
        return { valid: false, error: 'Value too long for 2D barcode' }
      }
      break
  }
  return { valid: true }
}

