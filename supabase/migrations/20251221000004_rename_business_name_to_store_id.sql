-- ================================
-- Rename business_name to store_id and link to stores table
-- ================================
-- Description: Changes business_name column to store_id (UUID foreign key to stores)
--              This links the business_profile to the store created in step 2
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Add new store_id column
-- =====================================================

DO $$
BEGIN
  -- Add store_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_profile'
    AND column_name = 'store_id'
  ) THEN
    ALTER TABLE public.business_profile 
    ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_business_profile_store_id 
    ON public.business_profile(store_id);
    
    RAISE NOTICE 'Added store_id column to business_profile';
  ELSE
    RAISE NOTICE 'Column business_profile.store_id already exists';
  END IF;
END $$;

-- =====================================================
-- PART 2: Migrate data from business_name to store_id
-- =====================================================

-- Link existing business profiles to their stores
DO $$
DECLARE
  v_matched_count INTEGER;
BEGIN
  -- Link business_profile.store_id to stores.id where stores.business_id = business_profile.id
  UPDATE public.business_profile bp
  SET store_id = (
    SELECT s.id 
    FROM public.stores s 
    WHERE s.business_id = bp.id 
    ORDER BY s.created_at ASC 
    LIMIT 1
  )
  WHERE bp.store_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.stores s WHERE s.business_id = bp.id
    );
  
  GET DIAGNOSTICS v_matched_count = ROW_COUNT;
  RAISE NOTICE 'Linked % business profiles to their stores', v_matched_count;
END $$;

-- =====================================================
-- PART 3: Drop business_name column
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_profile'
    AND column_name = 'business_name'
  ) THEN
    ALTER TABLE public.business_profile 
    DROP COLUMN business_name;
    
    RAISE NOTICE 'Dropped column: business_profile.business_name';
  ELSE
    RAISE NOTICE 'Column business_profile.business_name does not exist';
  END IF;
END $$;

-- =====================================================
-- PART 4: Add comment
-- =====================================================

COMMENT ON COLUMN public.business_profile.store_id IS 'Reference to the primary store for this business. Set when store is created in onboarding step 2.';

-- =====================================================
-- PART 5: Update RPC function to set store_id
-- =====================================================

DROP FUNCTION IF EXISTS public.save_store_details_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_store_details_onboarding(
  p_store_name TEXT DEFAULT NULL,
  p_store_name_ar TEXT DEFAULT NULL,
  p_category_ids UUID[] DEFAULT NULL,
  p_store_types TEXT[] DEFAULT ARRAY['online'],
  p_country_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_opening_hours JSONB DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_business_profile_id UUID;
  v_store_id UUID;
  v_store_slug TEXT;
  v_store_type TEXT;
  v_final_address TEXT;
  v_city_name TEXT;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Get business_profile_id for this user
  SELECT id INTO v_business_profile_id
  FROM public.business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_business_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Business profile not found. Please complete step 1 first.');
  END IF;
  
  -- Validate at least one store name is provided
  IF (p_store_name IS NULL OR TRIM(p_store_name) = '') AND (p_store_name_ar IS NULL OR TRIM(p_store_name_ar) = '') THEN
    RETURN json_build_object('success', false, 'error', 'At least one store name (English or Arabic) is required');
  END IF;
  
  -- Generate slug from store name (prefer English, fallback to Arabic)
  v_store_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NULLIF(TRIM(p_store_name), ''), NULLIF(TRIM(p_store_name_ar), ''), 'store'),
    '[^a-z0-9]+', '-', 'g'
  ));
  
  -- Remove leading/trailing hyphens
  v_store_slug := TRIM(BOTH '-' FROM v_store_slug);
  
  -- Ensure slug is unique
  WHILE EXISTS (SELECT 1 FROM public.stores WHERE slug = v_store_slug) LOOP
    v_store_slug := v_store_slug || '-' || FLOOR(RANDOM() * 10000)::TEXT;
  END LOOP;
  
  -- Determine primary store type (use first from array)
  v_store_type := COALESCE(p_store_types[1], 'online');
  
  -- Only set address if store type includes 'retail'
  -- Address is NULL for online-only stores
  IF 'retail' = ANY(p_store_types) OR 'hybrid' = ANY(p_store_types) THEN
    v_final_address := p_address;
  ELSE
    v_final_address := NULL;
  END IF;
  
  -- Get city name from cities table
  IF p_city_id IS NOT NULL THEN
    SELECT name INTO v_city_name FROM public.cities WHERE id = p_city_id;
  END IF;
  
  -- Check if store already exists for this business
  SELECT id INTO v_store_id
  FROM public.stores
  WHERE business_id = v_business_profile_id
  LIMIT 1;
  
  IF v_store_id IS NOT NULL THEN
    -- Update existing store
    UPDATE public.stores
    SET 
      name = NULLIF(TRIM(p_store_name), ''),
      name_ar = NULLIF(TRIM(p_store_name_ar), ''),
      country = p_country_id,
      city = COALESCE(v_city_name, p_city_id::TEXT),
      address = v_final_address,
      store_type = v_store_type::store_type_enum,
      opening_hours = CASE 
        WHEN 'retail' = ANY(p_store_types) OR 'hybrid' = ANY(p_store_types) OR 'pop_up' = ANY(p_store_types)
        THEN p_opening_hours 
        ELSE NULL 
      END,
      logo_url = COALESCE(p_logo_url, logo_url),
      updated_at = NOW()
    WHERE id = v_store_id;
  ELSE
    -- Create new store
    INSERT INTO public.stores (
      business_id,
      name,
      name_ar,
      slug,
      country,
      city,
      address,
      store_type,
      opening_hours,
      logo_url,
      platform,
      is_active
    )
    VALUES (
      v_business_profile_id,
      NULLIF(TRIM(p_store_name), ''),
      NULLIF(TRIM(p_store_name_ar), ''),
      v_store_slug,
      p_country_id,
      COALESCE(v_city_name, p_city_id::TEXT),
      v_final_address,
      v_store_type::store_type_enum,
      CASE 
        WHEN 'retail' = ANY(p_store_types) OR 'hybrid' = ANY(p_store_types) OR 'pop_up' = ANY(p_store_types)
        THEN p_opening_hours 
        ELSE NULL 
      END,
      p_logo_url,
      'haady',
      true
    )
    RETURNING id INTO v_store_id;
  END IF;
  
  -- Update business_profile with store_id (link to the store)
  UPDATE public.business_profile
  SET 
    store_id = v_store_id,
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  -- Handle category associations (if junction table exists)
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    -- Delete existing associations
    DELETE FROM public.store_categories WHERE store_id = v_store_id;
    
    -- Insert new associations
    INSERT INTO public.store_categories (store_id, category_id)
    SELECT v_store_id, unnest(p_category_ids)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'store_id', v_store_id,
    'business_profile_id', v_business_profile_id,
    'slug', v_store_slug
  );
  
EXCEPTION
  WHEN undefined_table THEN
    -- store_categories table might not exist, that's okay
    RETURN json_build_object(
      'success', true,
      'store_id', v_store_id,
      'business_profile_id', v_business_profile_id,
      'slug', v_store_slug,
      'warning', 'Category associations skipped - table not found'
    );
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_store_details_onboarding IS 'Step 2 of onboarding: Saves store details to stores table and links it to business_profile via store_id. Address is only saved for retail/hybrid store types.';
GRANT EXECUTE ON FUNCTION public.save_store_details_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Renamed business_name to store_id';
  RAISE NOTICE '  - Added store_id column (UUID FK to stores)';
  RAISE NOTICE '  - Migrated existing data';
  RAISE NOTICE '  - Dropped business_name column';
  RAISE NOTICE '  - Updated save_store_details_onboarding RPC';
  RAISE NOTICE '';
  RAISE NOTICE 'Now business_profile.store_id links to stores.id';
  RAISE NOTICE 'Set automatically when store is created in step 2';
  RAISE NOTICE '==============================================';
END $$;

