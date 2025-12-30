-- ================================
-- Add Barcode and External Identifier Fields
-- ================================
-- Migration to add barcode support and external platform identifier tracking

-- Add barcode field to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode text,
ADD COLUMN IF NOT EXISTS barcode_type text DEFAULT 'EAN13',
ADD COLUMN IF NOT EXISTS sku_auto_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS barcode_auto_generated boolean DEFAULT false;

-- Add external identifier fields to product_sources table
ALTER TABLE public.product_sources
ADD COLUMN IF NOT EXISTS platform_barcode text,
ADD COLUMN IF NOT EXISTS use_platform_sku boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS use_platform_barcode boolean DEFAULT false;

-- Create indexes for barcode lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_sources_platform_barcode ON public.product_sources(platform_barcode) WHERE platform_barcode IS NOT NULL;

-- Create SKU settings table for store-level configuration
CREATE TABLE IF NOT EXISTS public.sku_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- SKU generation settings
  sku_prefix text DEFAULT 'PROD',
  sku_separator text DEFAULT '-',
  sku_include_date boolean DEFAULT false,
  sku_date_format text DEFAULT 'YYMM', -- 'YYMM', 'YYMMDD', 'MMDD'
  sku_sequence_length integer DEFAULT 6,
  sku_use_product_name boolean DEFAULT false,
  sku_auto_generate boolean DEFAULT true,
  
  -- Barcode generation settings  
  barcode_type text DEFAULT 'INTERNAL', -- 'EAN13', 'EAN8', 'UPC-A', 'CODE128', 'INTERNAL'
  barcode_prefix text DEFAULT '200',
  barcode_auto_generate boolean DEFAULT true,
  
  -- External platform settings
  prefer_external_sku boolean DEFAULT false, -- When importing, use platform SKU if available
  prefer_external_barcode boolean DEFAULT false, -- When importing, use platform barcode if available
  
  -- Sequence tracking
  last_sku_sequence integer DEFAULT 0,
  last_barcode_sequence bigint DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(store_id)
);

-- Enable RLS
ALTER TABLE public.sku_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their store's SKU settings
CREATE POLICY "Users can view their store SKU settings"
  ON public.sku_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE s.id = sku_settings.store_id
        AND mu.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert their store's SKU settings
CREATE POLICY "Users can insert their store SKU settings"
  ON public.sku_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE s.id = sku_settings.store_id
        AND mu.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update their store's SKU settings
CREATE POLICY "Users can update their store SKU settings"
  ON public.sku_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE s.id = sku_settings.store_id
        AND mu.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE s.id = sku_settings.store_id
        AND mu.auth_user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE public.sku_settings IS 'Store-level SKU and barcode generation settings';
COMMENT ON COLUMN public.sku_settings.sku_prefix IS 'Prefix for generated SKUs (e.g., PROD, STK)';
COMMENT ON COLUMN public.sku_settings.barcode_type IS 'Type of barcode to generate: EAN13, EAN8, UPC-A, CODE128, INTERNAL';
COMMENT ON COLUMN public.sku_settings.prefer_external_sku IS 'When importing products, prefer platform SKU over auto-generated';
COMMENT ON COLUMN public.sku_settings.prefer_external_barcode IS 'When importing products, prefer platform barcode over auto-generated';

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_sku_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_sku_settings_updated_at ON public.sku_settings;
CREATE TRIGGER trigger_sku_settings_updated_at
  BEFORE UPDATE ON public.sku_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_sku_settings_updated_at();

-- Create function to generate next SKU sequence
CREATE OR REPLACE FUNCTION get_next_sku_sequence(p_store_id uuid)
RETURNS integer AS $$
DECLARE
  v_sequence integer;
BEGIN
  UPDATE public.sku_settings
  SET last_sku_sequence = last_sku_sequence + 1
  WHERE store_id = p_store_id
  RETURNING last_sku_sequence INTO v_sequence;
  
  IF v_sequence IS NULL THEN
    -- Create settings if not exists
    INSERT INTO public.sku_settings (store_id, last_sku_sequence)
    VALUES (p_store_id, 1)
    ON CONFLICT (store_id) DO UPDATE
    SET last_sku_sequence = sku_settings.last_sku_sequence + 1
    RETURNING last_sku_sequence INTO v_sequence;
  END IF;
  
  RETURN v_sequence;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate next barcode sequence
CREATE OR REPLACE FUNCTION get_next_barcode_sequence(p_store_id uuid)
RETURNS bigint AS $$
DECLARE
  v_sequence bigint;
BEGIN
  UPDATE public.sku_settings
  SET last_barcode_sequence = last_barcode_sequence + 1
  WHERE store_id = p_store_id
  RETURNING last_barcode_sequence INTO v_sequence;
  
  IF v_sequence IS NULL THEN
    -- Create settings if not exists
    INSERT INTO public.sku_settings (store_id, last_barcode_sequence)
    VALUES (p_store_id, 1)
    ON CONFLICT (store_id) DO UPDATE
    SET last_barcode_sequence = sku_settings.last_barcode_sequence + 1
    RETURNING last_barcode_sequence INTO v_sequence;
  END IF;
  
  RETURN v_sequence;
END;
$$ LANGUAGE plpgsql;

