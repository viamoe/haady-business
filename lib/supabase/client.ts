'use client';
import { createBrowserClient } from '@supabase/ssr';

// Create Supabase client with proper error handling
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
