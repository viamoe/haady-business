-- ================================
-- Add name_ar column to stores table
-- ================================
-- Description: Adds Arabic name column to stores table for bilingual store names
-- Date: 2025-12-16

-- Add name_ar column if it doesn't exist
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Add comment
COMMENT ON COLUMN public.stores.name_ar IS 'Arabic name of the store. Used for bilingual store names alongside the English name.';

