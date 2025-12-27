-- ================================
-- Fix store_categories foreign key issue in RPC
-- ================================
-- Description: Fixes the RPC function to properly handle store_categories insertion
--              and adds better error handling for foreign key constraints
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Update RPC function with better error handling
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
  v_has_retail_type BOOLEAN;
  v_final_opening_hours JSONB;
  v_category_warning TEXT;
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
  
  -- Check if 'retail' is in the store_types array
  v_has_retail_type := 'retail' = ANY(p_store_types);
  
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
  
  -- Only set address if store type includes 'retail' or 'hybrid'
  -- Address is NULL for online-only stores
  IF 'retail' = ANY(p_store_types) OR 'hybrid' = ANY(p_store_types) THEN
    v_final_address := p_address;
  ELSE
    v_final_address := NULL;
  END IF;
  
  -- Only set opening_hours if 'retail' is in the store_types array
  -- Opening hours are only relevant for physical/retail stores
  IF v_has_retail_type THEN
    v_final_opening_hours := p_opening_hours;
  ELSE
    v_final_opening_hours := NULL;
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
      opening_hours = v_final_opening_hours,
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
      v_final_opening_hours,
      p_logo_url,
      'haady',
      true
    )
    RETURNING id INTO v_store_id;
  END IF;
  
  -- Verify store was created/updated successfully
  IF v_store_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Failed to create or update store');
  END IF;
  
  -- Update business_profile with store_id (link to the store)
  UPDATE public.business_profile
  SET 
    store_id = v_store_id,
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  -- Handle category associations (if junction table exists)
  -- Store categories is multi-select, so we handle all selected categories
  v_category_warning := NULL;
  
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    BEGIN
      -- Verify store exists before trying to insert categories
      IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = v_store_id) THEN
        v_category_warning := 'Store not found, skipping category associations';
      ELSE
        -- Delete existing associations
        DELETE FROM public.store_categories WHERE store_id = v_store_id;
        
        -- Insert new associations (all selected categories)
        INSERT INTO public.store_categories (store_id, category_id)
        SELECT v_store_id, unnest(p_category_ids)
        WHERE EXISTS (SELECT 1 FROM public.stores WHERE id = v_store_id)
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION
      WHEN foreign_key_violation THEN
        -- Foreign key violation - store_id or category_id doesn't exist
        v_category_warning := 'Some categories could not be associated - invalid store_id or category_id';
      WHEN undefined_table THEN
        -- store_categories table doesn't exist
        v_category_warning := 'Category associations skipped - table not found';
      WHEN OTHERS THEN
        -- Other errors
        v_category_warning := 'Category associations skipped: ' || SQLERRM;
    END;
  END IF;
  
  -- Build response
  IF v_category_warning IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'store_id', v_store_id,
      'business_profile_id', v_business_profile_id,
      'slug', v_store_slug,
      'warning', v_category_warning
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'store_id', v_store_id,
      'business_profile_id', v_business_profile_id,
      'slug', v_store_slug
    );
  END IF;
  
EXCEPTION
  WHEN undefined_column THEN
    -- If opening_hours column doesn't exist, return error with helpful message
    RETURN json_build_object(
      'success', false, 
      'error', 'Database schema error: opening_hours column not found. Please contact support.'
    );
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_store_details_onboarding IS 'Step 2 of onboarding: Saves store details to stores table. Opening hours only set when retail is in store_types array. Categories and store_types are multi-select. Handles store_categories foreign key constraints properly.';
GRANT EXECUTE ON FUNCTION public.save_store_details_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Fixed store_categories foreign key handling';
  RAISE NOTICE '  - Added verification that store exists before category insert';
  RAISE NOTICE '  - Added proper error handling for foreign_key_violation';
  RAISE NOTICE '  - Categories are optional - store creation succeeds even if categories fail';
  RAISE NOTICE '==============================================';
END $$;

