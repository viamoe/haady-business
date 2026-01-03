-- ================================
-- Add QR Code Field to Products
-- ================================
-- Description: Adds QR code field to products table for in-store gifting
--              and website-to-mobile app scanning functionality
-- Date: 2026-01-03

-- Add QR code field to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS qr_code text,
ADD COLUMN IF NOT EXISTS qr_code_auto_generated boolean DEFAULT false;

-- Add index for QR code lookups
CREATE INDEX IF NOT EXISTS idx_products_qr_code ON public.products(qr_code) WHERE qr_code IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.products.qr_code IS 'QR code URL/data for product scanning (for in-store gifting and mobile app deep linking)';
COMMENT ON COLUMN public.products.qr_code_auto_generated IS 'Whether the QR code was auto-generated';

