-- ================================
-- Add UUID Prefix to Store Slugs
-- ================================
-- This migration adds the first 4 characters of the store's UUID to the slug
-- for guaranteed uniqueness.
--
-- Example: "Nike Store" with UUID "43320ae4-..." → "nike-store-4332"

-- ================================
-- Step 1: Update existing slugs to include UUID prefix
-- ================================
DO $$
DECLARE
  store_record RECORD;
  new_slug TEXT;
  base_slug TEXT;
  uuid_prefix TEXT;
BEGIN
  -- Loop through all stores
  FOR store_record IN 
    SELECT id, name, name_ar, slug 
    FROM public.stores 
    WHERE name IS NOT NULL OR name_ar IS NOT NULL
  LOOP
    -- Generate base slug: LOWER first, then replace non-alphanumeric
    base_slug := REGEXP_REPLACE(
      LOWER(COALESCE(NULLIF(TRIM(store_record.name), ''), NULLIF(TRIM(store_record.name_ar), ''), 'store')),
      '[^a-z0-9]+', '-', 'g'
    );
    
    -- Remove leading/trailing hyphens
    base_slug := TRIM(BOTH '-' FROM base_slug);
    
    -- Get first 4 characters of UUID for uniqueness
    uuid_prefix := LEFT(store_record.id::TEXT, 4);
    
    -- Append UUID prefix to slug
    new_slug := base_slug || '-' || uuid_prefix;
    
    -- Update the store with new slug
    IF new_slug != store_record.slug OR store_record.slug IS NULL THEN
      UPDATE public.stores 
      SET slug = new_slug, updated_at = NOW()
      WHERE id = store_record.id;
      
      RAISE NOTICE 'Updated store % slug from "%" to "%"', store_record.id, store_record.slug, new_slug;
    END IF;
  END LOOP;
END $$;

-- ================================
-- Step 2: Update the RPC function with UUID prefix logic
-- ================================
CREATE OR REPLACE FUNCTION public.save_store_details_onboarding_step(
  p_store_name TEXT DEFAULT NULL,
  p_store_name_ar TEXT DEFAULT NULL,
  p_country_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_store_types TEXT[] DEFAULT ARRAY['online'],
  p_opening_hours JSONB DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_category_ids UUID[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_business_profile_id UUID;
  v_store_id UUID;
  v_store_slug TEXT;
  v_store_types_array store_type_enum[];
  v_final_address TEXT;
  v_city_name TEXT;
  v_has_retail_type BOOLEAN;
  v_final_opening_hours JSONB;
  v_country_timezone TEXT;
  v_final_categories UUID[];
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Get business profile ID
  SELECT id INTO v_business_profile_id
  FROM public.business_profile
  WHERE auth_user_id = v_user_id;
  
  IF v_business_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Business profile not found');
  END IF;
  
  -- Convert text array to enum array for store_types
  v_store_types_array := ARRAY[]::store_type_enum[];
  IF p_store_types IS NOT NULL AND array_length(p_store_types, 1) > 0 THEN
    FOR i IN 1..array_length(p_store_types, 1) LOOP
      BEGIN
        v_store_types_array := array_append(v_store_types_array, p_store_types[i]::store_type_enum);
      EXCEPTION WHEN invalid_text_representation THEN
        -- Skip invalid enum values
        NULL;
      END;
    END LOOP;
  END IF;
  
  -- Default to 'online' if no valid types provided
  IF array_length(v_store_types_array, 1) IS NULL OR array_length(v_store_types_array, 1) = 0 THEN
    v_store_types_array := ARRAY['online']::store_type_enum[];
  END IF;
  
  -- Check if 'retail' or 'hybrid' is in the store_types array
  v_has_retail_type := 'retail' = ANY(v_store_types_array) OR 'hybrid' = ANY(v_store_types_array);
  
  -- Only set address if store type includes 'retail' or 'hybrid'
  IF v_has_retail_type THEN
    v_final_address := NULLIF(TRIM(p_address), '');
  ELSE
    v_final_address := NULL;
  END IF;
  
  -- Opening hours are only relevant for physical/retail stores
  IF v_has_retail_type THEN
    v_final_opening_hours := p_opening_hours;
  ELSE
    v_final_opening_hours := NULL;
  END IF;
  
  -- Get timezone from country
  IF p_country_id IS NOT NULL THEN
    SELECT timezone INTO v_country_timezone FROM public.countries WHERE id = p_country_id;
  END IF;
  
  -- Handle categories
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    v_final_categories := p_category_ids;
  ELSE
    v_final_categories := ARRAY[]::UUID[];
  END IF;
  
  -- Generate base slug from store name (LOWER first, then regex)
  v_store_slug := REGEXP_REPLACE(
    LOWER(COALESCE(NULLIF(TRIM(p_store_name), ''), NULLIF(TRIM(p_store_name_ar), ''), 'store')),
    '[^a-z0-9]+', '-', 'g'
  );
  
  -- Remove leading/trailing hyphens
  v_store_slug := TRIM(BOTH '-' FROM v_store_slug);
  
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
    -- Update existing store - append UUID prefix to slug for uniqueness
    v_store_slug := v_store_slug || '-' || LEFT(v_store_id::TEXT, 4);
    
    UPDATE public.stores
    SET 
      name = NULLIF(TRIM(p_store_name), ''),
      name_ar = NULLIF(TRIM(p_store_name_ar), ''),
      slug = v_store_slug,
      country = p_country_id,
      city = COALESCE(v_city_name, p_city_id::TEXT),
      address = v_final_address,
      store_type = v_store_types_array,
      opening_hours = v_final_opening_hours,
      logo_url = COALESCE(p_logo_url, logo_url),
      updated_at = NOW()
    WHERE id = v_store_id;
  ELSE
    -- Create new store (slug will be updated after to include UUID prefix)
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
      v_store_slug, -- temporary slug without UUID prefix
      p_country_id,
      COALESCE(v_city_name, p_city_id::TEXT),
      v_final_address,
      v_store_types_array,
      v_final_opening_hours,
      p_logo_url,
      'haady',
      true
    )
    RETURNING id INTO v_store_id;
    
    -- Now update slug with UUID prefix for uniqueness
    v_store_slug := v_store_slug || '-' || LEFT(v_store_id::TEXT, 4);
    UPDATE public.stores SET slug = v_store_slug WHERE id = v_store_id;
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
  IF array_length(v_final_categories, 1) > 0 THEN
    BEGIN
      -- Delete existing associations
      DELETE FROM public.store_categories WHERE store_id = v_store_id;
      
      -- Insert new associations
      INSERT INTO public.store_categories (store_id, category_id)
      SELECT v_store_id, unnest(v_final_categories)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN undefined_table THEN
      -- store_categories table doesn't exist, skip
      NULL;
    END;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'store_id', v_store_id,
    'business_profile_id', v_business_profile_id,
    'slug', v_store_slug,
    'timezone', v_country_timezone,
    'categories_count', array_length(v_final_categories, 1),
    'store_types', v_store_types_array,
    'onboarding_step', 'summary'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.save_store_details_onboarding_step IS 'Saves store details during onboarding. Slug includes first 4 chars of UUID for uniqueness (e.g., nike-store-4332).';

