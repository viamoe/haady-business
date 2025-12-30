-- ============================================
-- HAADY GIFT CODE SYSTEM
-- Enables scan-to-gift from physical retail
-- ============================================

-- ============================================
-- 1. GIFT CODES TABLE
-- Unique codes linked to products for QR generation
-- ============================================
CREATE TABLE IF NOT EXISTS public.gift_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL, -- Short code like "HG-ABC123"
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.store_branches(id) ON DELETE SET NULL,
  
  -- Code settings
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  
  -- Customization
  custom_message TEXT, -- Default gift message
  discount_percent DECIMAL(5,2), -- Optional discount for in-store gifts
  discount_amount DECIMAL(10,2),
  
  -- Metadata
  qr_style JSONB DEFAULT '{"foreground": "#F4610B", "background": "#FFFFFF"}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast code lookups
CREATE INDEX idx_gift_codes_code ON public.gift_codes(code);
CREATE INDEX idx_gift_codes_product ON public.gift_codes(product_id);
CREATE INDEX idx_gift_codes_store ON public.gift_codes(store_id);
CREATE INDEX idx_gift_codes_active ON public.gift_codes(is_active) WHERE is_active = TRUE;

-- ============================================
-- 2. GIFT CODE SCANS TABLE
-- Track every QR code scan
-- ============================================
CREATE TABLE IF NOT EXISTS public.gift_code_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.gift_codes(id) ON DELETE CASCADE,
  
  -- Scanner info
  user_id UUID REFERENCES auth.users(id), -- If logged in
  session_id VARCHAR(100), -- For anonymous tracking
  
  -- Context
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  scan_source VARCHAR(50) DEFAULT 'qr', -- qr, nfc, link, kiosk
  
  -- Device & location
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  -- Geolocation (if permitted)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Conversion tracking
  converted BOOLEAN DEFAULT FALSE,
  conversion_at TIMESTAMPTZ,
  gift_order_id UUID, -- Links to gift_orders when converted
  
  -- Funnel tracking
  added_to_cart BOOLEAN DEFAULT FALSE,
  started_checkout BOOLEAN DEFAULT FALSE,
  completed_payment BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_gift_code_scans_code ON public.gift_code_scans(code_id);
CREATE INDEX idx_gift_code_scans_user ON public.gift_code_scans(user_id);
CREATE INDEX idx_gift_code_scans_date ON public.gift_code_scans(scanned_at);
CREATE INDEX idx_gift_code_scans_converted ON public.gift_code_scans(converted) WHERE converted = TRUE;

-- ============================================
-- 3. GIFT ORDERS TABLE
-- When someone sends a gift via Haady
-- ============================================
CREATE TABLE IF NOT EXISTS public.gift_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL, -- HG-20251229-XXXX
  
  -- Source
  code_id UUID REFERENCES public.gift_codes(id), -- From QR scan (nullable for direct gifts)
  scan_id UUID REFERENCES public.gift_code_scans(id),
  
  -- Sender
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_username VARCHAR(50),
  
  -- Recipient (Haady's @username model)
  recipient_username VARCHAR(50) NOT NULL, -- @username
  recipient_id UUID REFERENCES auth.users(id), -- If recipient is registered
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  
  -- Product
  product_id UUID NOT NULL REFERENCES public.products(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SAR',
  
  -- Gift details
  gift_message TEXT,
  gift_wrap BOOLEAN DEFAULT FALSE,
  gift_wrap_style VARCHAR(50),
  is_anonymous BOOLEAN DEFAULT FALSE, -- Hide sender name
  reveal_date TIMESTAMPTZ, -- Scheduled reveal
  
  -- Status
  status VARCHAR(30) DEFAULT 'pending',
  -- pending → notified → accepted → processing → shipped → delivered
  -- or: pending → notified → declined / expired
  
  -- Recipient actions
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  
  -- Delivery (filled by recipient)
  delivery_address JSONB,
  delivery_instructions TEXT,
  preferred_delivery_date DATE,
  preferred_delivery_time VARCHAR(50),
  
  -- Fulfillment
  processing_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  tracking_number VARCHAR(100),
  tracking_url TEXT,
  delivered_at TIMESTAMPTZ,
  delivery_proof JSONB, -- Photo, signature, etc.
  
  -- Payment
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gift_orders_number ON public.gift_orders(order_number);
CREATE INDEX idx_gift_orders_sender ON public.gift_orders(sender_id);
CREATE INDEX idx_gift_orders_recipient ON public.gift_orders(recipient_username);
CREATE INDEX idx_gift_orders_recipient_id ON public.gift_orders(recipient_id);
CREATE INDEX idx_gift_orders_code ON public.gift_orders(code_id);
CREATE INDEX idx_gift_orders_status ON public.gift_orders(status);
CREATE INDEX idx_gift_orders_store ON public.gift_orders(store_id);
CREATE INDEX idx_gift_orders_date ON public.gift_orders(created_at);

-- ============================================
-- 4. GIFT ANALYTICS AGGREGATES
-- Pre-computed stats for dashboard performance
-- ============================================
CREATE TABLE IF NOT EXISTS public.gift_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Scan metrics
  total_scans INTEGER DEFAULT 0,
  unique_scanners INTEGER DEFAULT 0,
  
  -- Conversion metrics
  carts_created INTEGER DEFAULT 0,
  checkouts_started INTEGER DEFAULT 0,
  gifts_completed INTEGER DEFAULT 0,
  
  -- Revenue
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  avg_order_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Top products (JSONB array)
  top_scanned_products JSONB DEFAULT '[]',
  top_gifted_products JSONB DEFAULT '[]',
  
  -- Source breakdown
  scans_by_source JSONB DEFAULT '{}', -- {qr: 100, nfc: 20, link: 50}
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id, date)
);

CREATE INDEX idx_gift_analytics_store_date ON public.gift_analytics_daily(store_id, date);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_code_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Gift Codes: Merchants can manage their own codes
CREATE POLICY "Users can view their store gift codes"
  ON public.gift_codes FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create gift codes for their stores"
  ON public.gift_codes FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their store gift codes"
  ON public.gift_codes FOR UPDATE
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their store gift codes"
  ON public.gift_codes FOR DELETE
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE bp.auth_user_id = auth.uid()
    )
  );

-- Gift Code Scans: Anyone can insert (tracking), merchants can view their store's scans
CREATE POLICY "Anyone can record a scan"
  ON public.gift_code_scans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view scans for their store codes"
  ON public.gift_code_scans FOR SELECT
  USING (
    code_id IN (
      SELECT gc.id FROM public.gift_codes gc
      WHERE gc.store_id IN (
        SELECT s.id FROM public.stores s
        JOIN public.business_profile bp ON s.business_id = bp.id
        WHERE bp.auth_user_id = auth.uid()
      )
    )
  );

-- Gift Orders: Senders and recipients can view, merchants can view their store's orders
CREATE POLICY "Users can view gift orders they sent"
  ON public.gift_orders FOR SELECT
  USING (sender_id = auth.uid());

CREATE POLICY "Users can view gift orders they received"
  ON public.gift_orders FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Merchants can view their store gift orders"
  ON public.gift_orders FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create gift orders"
  ON public.gift_orders FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update their gift orders"
  ON public.gift_orders FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE POLICY "Merchants can update their store gift orders"
  ON public.gift_orders FOR UPDATE
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE bp.auth_user_id = auth.uid()
    )
  );

-- Analytics: Merchants can view their store analytics
CREATE POLICY "Users can view their store analytics"
  ON public.gift_analytics_daily FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE bp.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Generate unique gift code
CREATE OR REPLACE FUNCTION generate_gift_code()
RETURNS VARCHAR(10) AS $$
DECLARE
  new_code VARCHAR(10);
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate code like "HG-ABC123"
    new_code := 'HG-' || upper(substr(md5(random()::text), 1, 6));
    
    SELECT COUNT(*) INTO exists_count
    FROM public.gift_codes
    WHERE code = new_code;
    
    IF exists_count = 0 THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate gift order number
CREATE OR REPLACE FUNCTION generate_gift_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_number VARCHAR(20);
  exists_count INTEGER;
  date_part VARCHAR(8);
  random_part VARCHAR(4);
BEGIN
  date_part := to_char(NOW(), 'YYYYMMDD');
  
  LOOP
    random_part := upper(substr(md5(random()::text), 1, 4));
    new_number := 'HG-' || date_part || '-' || random_part;
    
    SELECT COUNT(*) INTO exists_count
    FROM public.gift_orders
    WHERE order_number = new_number;
    
    IF exists_count = 0 THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Record a gift code scan
CREATE OR REPLACE FUNCTION record_gift_scan(
  p_code VARCHAR(10),
  p_user_id UUID DEFAULT NULL,
  p_session_id VARCHAR(100) DEFAULT NULL,
  p_source VARCHAR(50) DEFAULT 'qr',
  p_device_info JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_code_record RECORD;
  v_scan_id UUID;
  v_result JSONB;
BEGIN
  -- Find the gift code
  SELECT gc.*, p.name_en as product_name, p.price, p.image_url,
         s.name as store_name
  INTO v_code_record
  FROM public.gift_codes gc
  JOIN public.products p ON gc.product_id = p.id
  JOIN public.stores s ON gc.store_id = s.id
  WHERE gc.code = p_code AND gc.is_active = TRUE;
  
  IF v_code_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive gift code');
  END IF;
  
  -- Check expiration
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift code has expired');
  END IF;
  
  -- Check max uses
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift code usage limit reached');
  END IF;
  
  -- Record the scan
  INSERT INTO public.gift_code_scans (
    code_id, user_id, session_id, scan_source,
    device_info, ip_address, user_agent, latitude, longitude
  ) VALUES (
    v_code_record.id, p_user_id, p_session_id, p_source,
    p_device_info, p_ip_address, p_user_agent, p_latitude, p_longitude
  ) RETURNING id INTO v_scan_id;
  
  -- Increment scan count
  UPDATE public.gift_codes SET current_uses = current_uses + 1 WHERE id = v_code_record.id;
  
  -- Return product info for gift flow
  RETURN jsonb_build_object(
    'success', true,
    'scan_id', v_scan_id,
    'code', v_code_record.code,
    'product', jsonb_build_object(
      'id', v_code_record.product_id,
      'name', v_code_record.product_name,
      'price', v_code_record.price,
      'image_url', v_code_record.image_url,
      'store_name', v_code_record.store_name
    ),
    'discount', jsonb_build_object(
      'percent', v_code_record.discount_percent,
      'amount', v_code_record.discount_amount
    ),
    'custom_message', v_code_record.custom_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get gift analytics for a store
CREATE OR REPLACE FUNCTION get_gift_analytics(
  p_store_id UUID,
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_scans INTEGER;
  v_unique_scanners INTEGER;
  v_total_conversions INTEGER;
  v_total_revenue DECIMAL(12, 2);
  v_conversion_rate DECIMAL(5, 2);
  v_daily_stats JSONB;
  v_top_products JSONB;
BEGIN
  -- Total scans
  SELECT COUNT(*), COUNT(DISTINCT COALESCE(user_id::text, session_id))
  INTO v_total_scans, v_unique_scanners
  FROM public.gift_code_scans gcs
  JOIN public.gift_codes gc ON gcs.code_id = gc.id
  WHERE gc.store_id = p_store_id
    AND gcs.scanned_at::DATE BETWEEN p_start_date AND p_end_date;
  
  -- Conversions and revenue
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO v_total_conversions, v_total_revenue
  FROM public.gift_orders
  WHERE store_id = p_store_id
    AND created_at::DATE BETWEEN p_start_date AND p_end_date
    AND status NOT IN ('declined', 'expired', 'cancelled');
  
  -- Conversion rate
  IF v_total_scans > 0 THEN
    v_conversion_rate := (v_total_conversions::DECIMAL / v_total_scans * 100);
  ELSE
    v_conversion_rate := 0;
  END IF;
  
  -- Daily breakdown
  SELECT jsonb_agg(daily_row ORDER BY date)
  INTO v_daily_stats
  FROM (
    SELECT 
      d.date,
      COALESCE(scans.count, 0) as scans,
      COALESCE(orders.count, 0) as conversions,
      COALESCE(orders.revenue, 0) as revenue
    FROM generate_series(p_start_date, p_end_date, '1 day'::INTERVAL) d(date)
    LEFT JOIN (
      SELECT gcs.scanned_at::DATE as date, COUNT(*) as count
      FROM public.gift_code_scans gcs
      JOIN public.gift_codes gc ON gcs.code_id = gc.id
      WHERE gc.store_id = p_store_id
      GROUP BY gcs.scanned_at::DATE
    ) scans ON scans.date = d.date::DATE
    LEFT JOIN (
      SELECT created_at::DATE as date, COUNT(*) as count, SUM(total_amount) as revenue
      FROM public.gift_orders
      WHERE store_id = p_store_id AND status NOT IN ('declined', 'expired', 'cancelled')
      GROUP BY created_at::DATE
    ) orders ON orders.date = d.date::DATE
  ) daily_row;
  
  -- Top gifted products
  SELECT jsonb_agg(product_row ORDER BY gift_count DESC)
  INTO v_top_products
  FROM (
    SELECT 
      p.id,
      p.name_en as name,
      p.image_url,
      p.price,
      COUNT(go.id) as gift_count,
      SUM(go.total_amount) as revenue
    FROM public.gift_orders go
    JOIN public.products p ON go.product_id = p.id
    WHERE go.store_id = p_store_id
      AND go.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND go.status NOT IN ('declined', 'expired', 'cancelled')
    GROUP BY p.id, p.name_en, p.image_url, p.price
    ORDER BY gift_count DESC
    LIMIT 10
  ) product_row;
  
  RETURN jsonb_build_object(
    'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
    'summary', jsonb_build_object(
      'total_scans', v_total_scans,
      'unique_scanners', v_unique_scanners,
      'total_conversions', v_total_conversions,
      'total_revenue', v_total_revenue,
      'conversion_rate', v_conversion_rate,
      'avg_order_value', CASE WHEN v_total_conversions > 0 THEN v_total_revenue / v_total_conversions ELSE 0 END
    ),
    'daily', COALESCE(v_daily_stats, '[]'::JSONB),
    'top_products', COALESCE(v_top_products, '[]'::JSONB)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_gift_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gift_codes_updated_at
  BEFORE UPDATE ON public.gift_codes
  FOR EACH ROW EXECUTE FUNCTION update_gift_updated_at();

CREATE TRIGGER trigger_gift_orders_updated_at
  BEFORE UPDATE ON public.gift_orders
  FOR EACH ROW EXECUTE FUNCTION update_gift_updated_at();

-- Auto-generate gift code on insert
CREATE OR REPLACE FUNCTION auto_generate_gift_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_gift_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_gift_code
  BEFORE INSERT ON public.gift_codes
  FOR EACH ROW EXECUTE FUNCTION auto_generate_gift_code();

-- Auto-generate order number on insert
CREATE OR REPLACE FUNCTION auto_generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_gift_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_order_number
  BEFORE INSERT ON public.gift_orders
  FOR EACH ROW EXECUTE FUNCTION auto_generate_order_number();

-- Update conversion status when gift order is created from scan
CREATE OR REPLACE FUNCTION update_scan_conversion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_id IS NOT NULL THEN
    UPDATE public.gift_code_scans
    SET converted = TRUE,
        conversion_at = NOW(),
        gift_order_id = NEW.id,
        completed_payment = TRUE
    WHERE id = NEW.scan_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scan_conversion
  AFTER INSERT ON public.gift_orders
  FOR EACH ROW EXECUTE FUNCTION update_scan_conversion();

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON TABLE public.gift_codes IS 'QR/NFC gift codes that link products to Haady gift flow';
COMMENT ON TABLE public.gift_code_scans IS 'Tracks every scan of a gift code for analytics';
COMMENT ON TABLE public.gift_orders IS 'Gift orders sent via Haady @username system';
COMMENT ON TABLE public.gift_analytics_daily IS 'Pre-aggregated daily analytics for dashboard performance';

COMMENT ON FUNCTION generate_gift_code IS 'Generates unique gift code like HG-ABC123';
COMMENT ON FUNCTION record_gift_scan IS 'Records a scan and returns product info for gift flow';
COMMENT ON FUNCTION get_gift_analytics IS 'Returns comprehensive gift analytics for a store';

