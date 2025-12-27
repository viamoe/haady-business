-- Drop the pending_signups table (cleanup)
DROP TABLE IF EXISTS public.pending_signups CASCADE;

-- Drop the cleanup function if it exists
DROP FUNCTION IF EXISTS cleanup_expired_pending_signups();

