-- ================================
-- Add column descriptions to merchants table
-- ================================
-- Description: Add helpful descriptions to all columns in the merchants table
-- Date: 2024-12-12

-- Add descriptions to all columns
COMMENT ON COLUMN public.merchants.id IS 'Primary key UUID for the merchant account';
COMMENT ON COLUMN public.merchants.owner_id IS 'Reference to the merchant_user who owns this merchant account';
COMMENT ON COLUMN public.merchants.name IS 'Display name of the business/merchant';
COMMENT ON COLUMN public.merchants.contact_email IS 'Primary contact email address for the merchant';
COMMENT ON COLUMN public.merchants.status IS 'Current status of the merchant account (active, pending, suspended, inactive)';
COMMENT ON COLUMN public.merchants.kyc_status IS 'KYC verification status (pending, approved, rejected, incomplete)';
COMMENT ON COLUMN public.merchants.created_at IS 'Timestamp when the merchant account was created';
COMMENT ON COLUMN public.merchants.updated_at IS 'Timestamp when the merchant account was last updated';
COMMENT ON COLUMN public.merchants.is_active IS 'Whether the merchant account is currently active';
COMMENT ON COLUMN public.merchants.business_type_id IS 'Reference to the business type (UUID from business_types table)';
COMMENT ON COLUMN public.merchants.country IS 'Business country code (ISO2 format, e.g., AE, SA) selected during business setup';

