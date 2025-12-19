-- ================================
-- Add description to timezone column in stores table
-- ================================
-- Description: Adds description to the timezone column
-- Date: 2025-12-15

-- =====================================================
-- Add timezone column description
-- =====================================================

COMMENT ON COLUMN public.stores.timezone IS 'Timezone of the store (e.g., ''Asia/Riyadh'', ''UTC'', ''America/New_York''). Used for scheduling operations, opening hours, and time-based calculations.';

