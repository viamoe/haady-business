-- ================================
-- Add Logo Zoom Field
-- ================================
-- This migration adds logo_zoom field to store_connections table
-- to store the zoom level (scale) for the uploaded logo

-- ================================
-- Step 1: Add logo_zoom to store_connections
-- ================================
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS logo_zoom integer DEFAULT 100;

COMMENT ON COLUMN public.store_connections.logo_zoom IS 'Zoom level (scale percentage) for the store logo, default 100 (1x scale)';

