-- ================================
-- Add SKU and Barcode System
-- ================================
-- Migration to add barcode support and external platform identifier tracking

-- Step 1: Add barcode fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode text,
ADD COLUMN IF NOT EXISTS barcode_type text DEFAULT 'EAN13',
ADD COLUMN IF NOT EXISTS sku_auto_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS barcode_auto_generated boolean DEFAULT false;

-- Step 2: Add external identifier fields to product_sources table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_sources' AND table_schema = 'public') THEN
    ALTER TABLE public.product_sources
    ADD COLUMN IF NOT EXISTS platform_barcode text,
    ADD COLUMN IF NOT EXISTS use_platform_sku boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS use_platform_barcode boolean DEFAULT false;
  END IF;
END $$;

-- Step 3: Create indexes for barcode lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku) WHERE sku IS NOT NULL;

-- Step 4: Create SKU settings table for store-level configuration
CREATE TABLE IF NOT EXISTS public.sku_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- SKU generation settings
  sku_prefix text DEFAULT 'PROD',
  sku_separator text DEFAULT '-',
  sku_include_date boolean DEFAULT false,
  sku_date_format text DEFAULT 'YYMM',
  sku_sequence_length integer DEFAULT 6,
  sku_use_product_name boolean DEFAULT false,
  sku_auto_generate boolean DEFAULT true,
  
  -- Barcode generation settings  
  barcode_type text DEFAULT 'INTERNAL',
  barcode_prefix text DEFAULT '200',
  barcode_auto_generate boolean DEFAULT true,
  
  -- External platform settings
  prefer_external_sku boolean DEFAULT false,
  prefer_external_barcode boolean DEFAULT false,
  
  -- Sequence tracking
  last_sku_sequence integer DEFAULT 0,
  last_barcode_sequence bigint DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(store_id)
);

-- Step 5: Enable RLS on sku_settings
ALTER TABLE public.sku_settings ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for sku_settings
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their store SKU settings" ON public.sku_settings;
  DROP POLICY IF EXISTS "Users can insert their store SKU settings" ON public.sku_settings;
  DROP POLICY IF EXISTS "Users can update their store SKU settings" ON public.sku_settings;
END $$;

-- Create SELECT policy
CREATE POLICY "Users can view their store SKU settings"
  ON public.sku_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = sku_settings.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Create INSERT policy
CREATE POLICY "Users can insert their store SKU settings"
  ON public.sku_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = sku_settings.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Create UPDATE policy
CREATE POLICY "Users can update their store SKU settings"
  ON public.sku_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = sku_settings.store_id
        AND bp.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = sku_settings.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Step 7: Add comments
COMMENT ON TABLE public.sku_settings IS 'Store-level SKU and barcode generation settings';
COMMENT ON COLUMN public.products.barcode IS 'Product barcode (EAN-13, UPC-A, etc.)';
COMMENT ON COLUMN public.products.barcode_type IS 'Type of barcode: EAN13, EAN8, UPC-A, CODE128, INTERNAL';

-- Step 8: Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_sku_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_sku_settings_updated_at ON public.sku_settings;
CREATE TRIGGER trigger_sku_settings_updated_at
  BEFORE UPDATE ON public.sku_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_sku_settings_updated_at();

