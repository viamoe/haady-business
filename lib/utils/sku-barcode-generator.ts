/**
 * SKU and Barcode Generator Utility
 * 
 * Provides functions to generate unique SKUs and barcodes for products,
 * with support for external platform SKUs/barcodes when importing products.
 * Includes barcode image generation using bwip-js.
 */

// Note: bwip-js is server-only. For client-side barcode generation, use the /api/barcode endpoint
// import * as bwipjs from 'bwip-js'

export interface SKUGeneratorConfig {
  prefix?: string           // Store or category prefix (e.g., "STORE", "CAT")
  separator?: string        // Separator between parts (default: "-")
  includeDate?: boolean     // Include date in SKU
  dateFormat?: 'YYMM' | 'YYMMDD' | 'MMDD'
  sequenceLength?: number   // Length of sequence number (default: 4)
  useRandomSuffix?: boolean // Add random suffix for uniqueness
  randomSuffixLength?: number
}

export interface BarcodeGeneratorConfig {
  type: 'EAN13' | 'EAN8' | 'UPC-A' | 'CODE128' | 'INTERNAL'
  prefix?: string           // Prefix for internal barcodes
}

export interface GeneratedIdentifiers {
  sku: string
  barcode: string
  barcodeType: string
}

// Default configurations
const DEFAULT_SKU_CONFIG: SKUGeneratorConfig = {
  prefix: 'PROD',
  separator: '-',
  includeDate: false,
  dateFormat: 'YYMM',
  sequenceLength: 6,
  useRandomSuffix: true,
  randomSuffixLength: 4
}

const DEFAULT_BARCODE_CONFIG: BarcodeGeneratorConfig = {
  type: 'INTERNAL',
  prefix: '200'  // Internal use range for EAN-13
}

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length: number, numbersOnly: boolean = false): string {
  const chars = numbersOnly ? '0123456789' : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a timestamp-based string
 */
function generateTimestamp(format: 'YYMM' | 'YYMMDD' | 'MMDD' = 'YYMM'): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  
  switch (format) {
    case 'YYMMDD':
      return `${year}${month}${day}`
    case 'MMDD':
      return `${month}${day}`
    case 'YYMM':
    default:
      return `${year}${month}`
  }
}

/**
 * Generate SKU from product name
 */
function generateSkuFromName(name: string, maxLength: number = 6): string {
  // Remove special characters and split into words
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
  
  if (words.length === 0) return generateRandomString(maxLength)
  
  if (words.length === 1) {
    // Single word: take first N characters
    return words[0].slice(0, maxLength)
  }
  
  // Multiple words: take first letter(s) of each word
  let sku = ''
  const lettersPerWord = Math.max(1, Math.floor(maxLength / words.length))
  
  for (const word of words) {
    sku += word.slice(0, lettersPerWord)
    if (sku.length >= maxLength) break
  }
  
  return sku.slice(0, maxLength)
}

/**
 * Calculate EAN-13 check digit
 */
function calculateEAN13CheckDigit(digits: string): number {
  if (digits.length !== 12) throw new Error('EAN-13 requires 12 digits')
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10)
    sum += (i % 2 === 0) ? digit : digit * 3
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit
}

/**
 * Calculate UPC-A check digit
 */
function calculateUPCACheckDigit(digits: string): number {
  if (digits.length !== 11) throw new Error('UPC-A requires 11 digits')
  
  let oddSum = 0
  let evenSum = 0
  
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(digits[i], 10)
    if (i % 2 === 0) {
      oddSum += digit
    } else {
      evenSum += digit
    }
  }
  
  const total = (oddSum * 3) + evenSum
  const checkDigit = (10 - (total % 10)) % 10
  return checkDigit
}

/**
 * Generate a unique SKU
 */
export function generateSKU(
  productName?: string,
  config: Partial<SKUGeneratorConfig> = {},
  existingSkus: string[] = []
): string {
  const finalConfig = { ...DEFAULT_SKU_CONFIG, ...config }
  const { prefix, separator, includeDate, dateFormat, sequenceLength, useRandomSuffix, randomSuffixLength } = finalConfig
  
  const parts: string[] = []
  
  // Add prefix
  if (prefix) {
    parts.push(prefix)
  }
  
  // Add product name abbreviation
  if (productName) {
    parts.push(generateSkuFromName(productName, 4))
  }
  
  // Add date if configured
  if (includeDate && dateFormat) {
    parts.push(generateTimestamp(dateFormat))
  }
  
  // Add sequence number
  const sequenceNum = generateRandomString(sequenceLength || 6, true)
  parts.push(sequenceNum)
  
  // Add random suffix for uniqueness
  if (useRandomSuffix && randomSuffixLength) {
    parts.push(generateRandomString(randomSuffixLength))
  }
  
  let sku = parts.join(separator)
  
  // Ensure uniqueness
  let attempts = 0
  while (existingSkus.includes(sku) && attempts < 100) {
    const newSequence = generateRandomString(sequenceLength || 6, true)
    const newSuffix = useRandomSuffix ? generateRandomString(randomSuffixLength || 4) : ''
    parts[parts.length - (useRandomSuffix ? 2 : 1)] = newSequence
    if (useRandomSuffix) {
      parts[parts.length - 1] = newSuffix
    }
    sku = parts.join(separator)
    attempts++
  }
  
  return sku
}

/**
 * Generate a barcode
 */
export function generateBarcode(
  config: Partial<BarcodeGeneratorConfig> = {},
  existingBarcodes: string[] = []
): { barcode: string; type: string } {
  const finalConfig = { ...DEFAULT_BARCODE_CONFIG, ...config }
  const { type, prefix } = finalConfig
  
  let barcode = ''
  let barcodeType = type
  
  switch (type) {
    case 'EAN13': {
      // Generate 12 digits and add check digit
      const countryCode = '200' // Internal use prefix
      const manufacturerCode = generateRandomString(4, true)
      const productCode = generateRandomString(5, true)
      const digits = `${countryCode}${manufacturerCode}${productCode}`
      const checkDigit = calculateEAN13CheckDigit(digits)
      barcode = `${digits}${checkDigit}`
      break
    }
    
    case 'EAN8': {
      // Generate 7 digits and add check digit
      const digits = generateRandomString(7, true)
      let sum = 0
      for (let i = 0; i < 7; i++) {
        sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 3 : 1)
      }
      const checkDigit = (10 - (sum % 10)) % 10
      barcode = `${digits}${checkDigit}`
      break
    }
    
    case 'UPC-A': {
      // Generate 11 digits and add check digit
      const digits = generateRandomString(11, true)
      const checkDigit = calculateUPCACheckDigit(digits)
      barcode = `${digits}${checkDigit}`
      break
    }
    
    case 'CODE128': {
      // Alphanumeric code
      barcode = `${prefix || 'BC'}${generateRandomString(10)}`
      break
    }
    
    case 'INTERNAL':
    default: {
      // Internal barcode format with prefix
      const internalPrefix = prefix || '200'
      const productNum = generateRandomString(9, true)
      const digits = `${internalPrefix}${productNum}`
      // Use EAN-13 format for internal barcodes
      const checkDigit = calculateEAN13CheckDigit(digits.slice(0, 12).padStart(12, '0'))
      barcode = `${digits.slice(0, 12)}${checkDigit}`
      barcodeType = 'EAN13'
      break
    }
  }
  
  // Ensure uniqueness
  let attempts = 0
  while (existingBarcodes.includes(barcode) && attempts < 100) {
    return generateBarcode(config, existingBarcodes)
  }
  
  return { barcode, type: barcodeType }
}

/**
 * Generate QR code URL for a product
 * Creates a URL that works for both web and mobile app deep linking
 */
export function generateQRCodeURL(
  productId: string,
  storeId?: string,
  baseUrl?: string
): string {
  // Use provided base URL or default to haady.app
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://haady.app'
  
  // Remove protocol and trailing slashes for consistency
  const cleanBase = base.replace(/^https?:\/\//, '').replace(/\/$/, '')
  
  // Generate URL that works for both web and mobile app
  // Format: https://haady.app/product/{productId}?store={storeId}
  // This can be handled by:
  // - Web: Opens product page
  // - Mobile app: Deep links to product in app (via universal links)
  let url = `https://${cleanBase}/product/${productId}`
  
  if (storeId) {
    url += `?store=${storeId}`
  }
  
  return url
}

/**
 * Generate both SKU and Barcode
 */
export function generateIdentifiers(
  productName?: string,
  skuConfig?: Partial<SKUGeneratorConfig>,
  barcodeConfig?: Partial<BarcodeGeneratorConfig>,
  existingSkus: string[] = [],
  existingBarcodes: string[] = []
): GeneratedIdentifiers {
  const sku = generateSKU(productName, skuConfig, existingSkus)
  const { barcode, type } = generateBarcode(barcodeConfig, existingBarcodes)
  
  return {
    sku,
    barcode,
    barcodeType: type
  }
}

/**
 * Validate SKU format
 */
export function validateSKU(sku: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!sku || sku.trim().length === 0) {
    errors.push('SKU cannot be empty')
  }
  
  if (sku.length < 3) {
    errors.push('SKU must be at least 3 characters')
  }
  
  if (sku.length > 50) {
    errors.push('SKU must be less than 50 characters')
  }
  
  if (!/^[A-Za-z0-9\-_]+$/.test(sku)) {
    errors.push('SKU can only contain letters, numbers, hyphens, and underscores')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate barcode format
 */
export function validateBarcode(
  barcode: string,
  type: 'EAN13' | 'EAN8' | 'UPC-A' | 'CODE128' | 'ANY' = 'ANY'
): { valid: boolean; detectedType: string | null; errors: string[] } {
  const errors: string[] = []
  let detectedType: string | null = null
  
  if (!barcode || barcode.trim().length === 0) {
    errors.push('Barcode cannot be empty')
    return { valid: false, detectedType: null, errors }
  }
  
  // Check EAN-13
  if (barcode.length === 13 && /^\d{13}$/.test(barcode)) {
    const digits = barcode.slice(0, 12)
    const checkDigit = parseInt(barcode[12], 10)
    const calculatedCheckDigit = calculateEAN13CheckDigit(digits)
    
    if (checkDigit === calculatedCheckDigit) {
      detectedType = 'EAN13'
      if (type !== 'ANY' && type !== 'EAN13') {
        errors.push(`Expected ${type} format but detected EAN-13`)
      }
    } else {
      errors.push('Invalid EAN-13 check digit')
    }
  }
  // Check EAN-8
  else if (barcode.length === 8 && /^\d{8}$/.test(barcode)) {
    detectedType = 'EAN8'
    if (type !== 'ANY' && type !== 'EAN8') {
      errors.push(`Expected ${type} format but detected EAN-8`)
    }
  }
  // Check UPC-A
  else if (barcode.length === 12 && /^\d{12}$/.test(barcode)) {
    const digits = barcode.slice(0, 11)
    const checkDigit = parseInt(barcode[11], 10)
    const calculatedCheckDigit = calculateUPCACheckDigit(digits)
    
    if (checkDigit === calculatedCheckDigit) {
      detectedType = 'UPC-A'
      if (type !== 'ANY' && type !== 'UPC-A') {
        errors.push(`Expected ${type} format but detected UPC-A`)
      }
    } else {
      errors.push('Invalid UPC-A check digit')
    }
  }
  // Check Code 128 (alphanumeric)
  else if (/^[A-Za-z0-9\-_.]+$/.test(barcode) && barcode.length >= 4) {
    detectedType = 'CODE128'
    if (type !== 'ANY' && type !== 'CODE128') {
      errors.push(`Expected ${type} format but detected Code 128`)
    }
  } else {
    errors.push('Invalid barcode format')
  }
  
  return {
    valid: errors.length === 0 && detectedType !== null,
    detectedType,
    errors
  }
}

/**
 * SKU template patterns for different use cases
 */
export const SKU_TEMPLATES = {
  simple: {
    name: 'Simple',
    description: 'PREFIX-RANDOM (e.g., PROD-A1B2C3)',
    config: {
      prefix: 'PROD',
      separator: '-',
      sequenceLength: 6,
      useRandomSuffix: false
    }
  },
  withDate: {
    name: 'With Date',
    description: 'PREFIX-YYMM-RANDOM (e.g., PROD-2501-A1B2)',
    config: {
      prefix: 'PROD',
      separator: '-',
      includeDate: true,
      dateFormat: 'YYMM' as const,
      sequenceLength: 4,
      useRandomSuffix: false
    }
  },
  withName: {
    name: 'With Name',
    description: 'PREFIX-NAME-RANDOM (e.g., PROD-BRGER-1234)',
    config: {
      prefix: 'PROD',
      separator: '-',
      sequenceLength: 4,
      useRandomSuffix: false
    }
  },
  full: {
    name: 'Full',
    description: 'PREFIX-NAME-YYMM-RANDOM-SUFFIX (e.g., PROD-BRGER-2501-1234-AB)',
    config: {
      prefix: 'PROD',
      separator: '-',
      includeDate: true,
      dateFormat: 'YYMM' as const,
      sequenceLength: 4,
      useRandomSuffix: true,
      randomSuffixLength: 2
    }
  },
  numeric: {
    name: 'Numeric Only',
    description: 'Numbers only (e.g., 123456789)',
    config: {
      prefix: '',
      separator: '',
      sequenceLength: 9,
      useRandomSuffix: false
    }
  }
}

/**
 * Barcode format options
 */
export const BARCODE_FORMATS = {
  'EAN13': {
    name: 'EAN-13',
    description: 'International standard (13 digits)',
    length: 13
  },
  'EAN8': {
    name: 'EAN-8',
    description: 'Short form (8 digits)',
    length: 8
  },
  'UPC-A': {
    name: 'UPC-A',
    description: 'US/Canada standard (12 digits)',
    length: 12
  },
  'CODE128': {
    name: 'Code 128',
    description: 'Alphanumeric, flexible length',
    length: null
  },
  'INTERNAL': {
    name: 'Internal',
    description: 'Auto-generated EAN-13 with internal prefix',
    length: 13
  }
}

/**
 * Parse external platform SKU/Barcode and normalize
 */
export function normalizeExternalIdentifier(identifier: string): string {
  // Remove common prefixes and clean up
  return identifier
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9\-_]/g, '')
}

/**
 * Check if SKU/Barcode appears to be from an external platform
 */
export function detectExternalPlatform(identifier: string): string | null {
  const patterns: Record<string, RegExp> = {
    'salla': /^SAL|^SALLA/i,
    'zid': /^ZID|^Z-/i,
    'shopify': /^SHP|^SHOPIFY/i,
    'woocommerce': /^WOO|^WC-/i,
  }
  
  for (const [platform, pattern] of Object.entries(patterns)) {
    if (pattern.test(identifier)) {
      return platform
    }
  }
  
  return null
}

// ==========================================
// BARCODE IMAGE GENERATION
// ==========================================

export interface BarcodeImageOptions {
  /** Barcode value to encode */
  barcode: string
  /** Barcode type/format */
  type: 'EAN13' | 'EAN8' | 'UPC-A' | 'CODE128' | 'QR' | 'DATAMATRIX'
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Include human-readable text below barcode */
  includeText?: boolean
  /** Scale factor (1-10) */
  scale?: number
  /** Background color (hex without #) */
  backgroundColor?: string
  /** Barcode color (hex without #) */
  barcodeColor?: string
  /** Output format */
  format?: 'png' | 'svg'
}

/**
 * Map our barcode types to bwip-js encoder names
 */
const BWIP_ENCODER_MAP: Record<string, string> = {
  'EAN13': 'ean13',
  'EAN8': 'ean8',
  'UPC-A': 'upca',
  'CODE128': 'code128',
  'QR': 'qrcode',
  'DATAMATRIX': 'datamatrix'
}

/**
 * Generate barcode image as Data URL (base64 PNG)
 * Uses the /api/barcode endpoint for generation (works on both client and server)
 */
export async function generateBarcodeDataURL(
  options: BarcodeImageOptions
): Promise<string> {
  const {
    barcode,
    type,
    height = 80,
    includeText = true,
    scale = 3,
    backgroundColor = 'FFFFFF',
    barcodeColor = '000000'
  } = options

  try {
    // Use the API endpoint for barcode generation
    const response = await fetch('/api/barcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: barcode,
        type: type,
        format: 'png',
        height,
        scale,
        includeText,
        backgroundColor: `#${backgroundColor}`,
        barcodeColor: `#${barcodeColor}`,
        returnDataUrl: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate barcode: ${response.statusText}`)
    }

    const data = await response.json()
    return data.dataUrl
  } catch (error) {
    console.error('Error generating barcode image:', error)
    throw new Error(`Failed to generate barcode image: ${error}`)
  }
}

/**
 * Generate barcode URL for direct image embedding
 * Returns a URL to the barcode API endpoint
 */
export function getBarcodeImageURL(options: BarcodeImageOptions): string {
  const {
    barcode,
    type,
    height = 80,
    includeText = true,
    scale = 3,
  } = options

  const params = new URLSearchParams({
    value: barcode,
    type: type,
    format: 'png',
    height: String(height),
    scale: String(scale),
    includeText: String(includeText),
  })

  return `/api/barcode?${params.toString()}`
}

/**
 * Generate barcode image as img tag HTML (for client-side rendering)
 */
export async function generateBarcodeSVG(options: BarcodeImageOptions): Promise<string> {
  const dataUrl = await generateBarcodeDataURL(options)
  return `<img src="${dataUrl}" alt="barcode" />`
}

/**
 * Generate QR Code image as Data URL
 */
export async function generateQRCodeDataURL(
  data: string,
  size: number = 200
): Promise<string> {
  return generateBarcodeDataURL({
    barcode: data,
    type: 'QR',
    width: size,
    height: size,
    includeText: false,
    scale: 4
  })
}

/**
 * Generate QR Code as SVG string
 */
export async function generateQRCodeSVG(data: string, size: number = 200): Promise<string> {
  return generateBarcodeSVG({
    barcode: data,
    type: 'QR',
    width: size,
    height: size,
    includeText: false,
    scale: 4
  })
}

/**
 * Validate if a barcode can be rendered with the given type
 */
export function canRenderBarcode(barcode: string, type: string): boolean {
  try {
    const encoder = BWIP_ENCODER_MAP[type]
    if (!encoder) return false

    // Validate based on type
    switch (type) {
      case 'EAN13':
        return /^\d{13}$/.test(barcode)
      case 'EAN8':
        return /^\d{8}$/.test(barcode)
      case 'UPC-A':
        return /^\d{12}$/.test(barcode)
      case 'CODE128':
        return barcode.length > 0 && barcode.length <= 80
      case 'QR':
      case 'DATAMATRIX':
        return barcode.length > 0 && barcode.length <= 4296
      default:
        return false
    }
  } catch {
    return false
  }
}

/**
 * Get barcode dimensions based on type and content
 */
export function getRecommendedBarcodeSize(
  type: string,
  barcode: string
): { width: number; height: number } {
  switch (type) {
    case 'EAN13':
      return { width: 200, height: 80 }
    case 'EAN8':
      return { width: 150, height: 70 }
    case 'UPC-A':
      return { width: 200, height: 80 }
    case 'CODE128':
      // Width scales with content length
      return { width: Math.max(200, barcode.length * 12), height: 70 }
    case 'QR':
    case 'DATAMATRIX':
      // Square for 2D codes
      const size = Math.max(100, Math.min(300, barcode.length * 3))
      return { width: size, height: size }
    default:
      return { width: 200, height: 80 }
  }
}

