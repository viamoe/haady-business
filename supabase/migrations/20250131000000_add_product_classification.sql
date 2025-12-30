-- ====================================================================
-- Migration: Add Product Classification System
-- Description: Adds product type, selling method, fulfillment type, and related fields
--              to determine how products should be sold, tracked, and fulfilled
-- Date: 2025-01-31
-- ====================================================================

-- Create ENUM types for product classification
CREATE TYPE product_type_enum AS ENUM ('physical', 'digital', 'service');
CREATE TYPE selling_method_enum AS ENUM ('unit', 'weight', 'length', 'time', 'subscription');
CREATE TYPE fulfillment_type_enum AS ENUM ('pickup', 'delivery', 'digital', 'onsite');

-- Add classification columns to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type product_type_enum DEFAULT 'physical' NOT NULL,
  ADD COLUMN IF NOT EXISTS selling_method selling_method_enum DEFAULT 'unit' NOT NULL,
  ADD COLUMN IF NOT EXISTS selling_unit VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fulfillment_type fulfillment_type_enum[] DEFAULT ARRAY['pickup']::fulfillment_type_enum[] NOT NULL,
  ADD COLUMN IF NOT EXISTS requires_scheduling BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS subscription_interval VARCHAR(20) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.products.product_type IS 'Type of product: physical good, digital good, or service';
COMMENT ON COLUMN public.products.selling_method IS 'How the product is sold: by unit, weight, length, time, or subscription';
COMMENT ON COLUMN public.products.selling_unit IS 'Unit of measurement for selling (kg, lb, g, m, ft, hour, day, month, etc.)';
COMMENT ON COLUMN public.products.fulfillment_type IS 'Array of fulfillment methods: pickup, delivery, digital, onsite';
COMMENT ON COLUMN public.products.requires_scheduling IS 'Whether this product/service requires appointment scheduling';
COMMENT ON COLUMN public.products.subscription_interval IS 'For subscription products: daily, weekly, monthly, yearly';

-- Create index for faster filtering by product type
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_selling_method ON public.products(selling_method);

-- Update existing products to have default values (already set via DEFAULT, but ensure consistency)
UPDATE public.products
SET 
  product_type = COALESCE(product_type, 'physical'),
  selling_method = COALESCE(selling_method, 'unit'),
  fulfillment_type = COALESCE(fulfillment_type, ARRAY['pickup']::fulfillment_type_enum[])
WHERE product_type IS NULL OR selling_method IS NULL OR fulfillment_type IS NULL;

