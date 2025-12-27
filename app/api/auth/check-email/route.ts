import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIP, EMAIL_CHECK_RATE_LIMIT } from '@/lib/rate-limit';

/**
 * POST /api/auth/check-email
 * Check if an email already exists as a business user
 * Returns whether user should login or signup
 */
export async function POST(request: Request) {
  try {
    // Rate limiting: Check if client has exceeded rate limit
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit({
      ...EMAIL_CHECK_RATE_LIMIT,
      identifier: clientIP,
    });
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Please wait ${rateLimitResult.retryAfter} seconds before checking again.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(EMAIL_CHECK_RATE_LIMIT.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      );
    }
    
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // If service role key is not available, return unknown status
    // This allows graceful degradation - user can still proceed
    if (!serviceRoleKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not configured - skipping email check');
      return NextResponse.json({
        exists: null, // Unknown - let user proceed
        isBusiness: null,
        message: 'Email check unavailable',
      });
    }

    const adminClient = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in auth.users using optimized RPC function
    // This queries auth.users directly with an index lookup (O(1) performance)
    let authUser = null;
    
    try {
      // Try using RPC function first (most efficient)
      const { data: userData, error: rpcError } = await adminClient.rpc('get_user_by_email', {
        p_email: normalizedEmail
      });
      
      if (!rpcError && userData) {
        authUser = userData;
      } else if (rpcError && !rpcError.message?.includes('not found') && !rpcError.message?.includes('does not exist')) {
        // RPC function doesn't exist yet, fall back to admin API
        // This is a temporary fallback until RPC is deployed
        console.warn('RPC function not available, using admin API fallback:', rpcError.message);
        
        // Fallback: Use admin API listUsers with limited search
        // Only search first page (100 users) - if not found, assume user doesn't exist
        // This is much better than the old infinite pagination
        const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 100,
        });
        
        if (listError) {
          console.error('Error listing users:', listError);
          return NextResponse.json({
            exists: null,
            isBusiness: null,
            message: 'Email check unavailable',
          });
        }
        
        authUser = users.find(u => u.email?.toLowerCase() === normalizedEmail) || null;
      }
    } catch (error: any) {
      console.error('Error checking user by email:', error);
      return NextResponse.json({
        exists: null,
        isBusiness: null,
        message: 'Email check unavailable',
      });
    }

    if (!authUser) {
      // No auth user exists - user should signup
      return NextResponse.json({
        exists: false,
        isBusiness: false,
        shouldLogin: false,
        shouldSignup: true,
      });
    }

    // Check if user has a business_profile record
    const { data: businessProfile, error: checkError } = await adminClient
      .from('business_profile')
      .select('id, store_id, is_onboarded')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking business user:', checkError);
      return NextResponse.json({
        exists: null,
        isBusiness: null,
        message: 'Email check unavailable',
      });
    }

    if (businessProfile) {
      // User exists as business - should login
      return NextResponse.json({
        exists: true,
        isBusiness: true,
        shouldLogin: true,
        shouldSignup: false,
        message: 'You already have a Haady Business account. Please log in instead.',
      });
    }

    // Auth user exists but not as business - could be consumer app user
    // Still allow signup, but suggest login
    return NextResponse.json({
      exists: true,
      isBusiness: false,
      shouldLogin: true,
      shouldSignup: false,
      message: 'An account with this email already exists. Please log in instead.',
    });
  } catch (error: any) {
    console.error('Error checking email:', error);
    // Return unknown status on error - don't block user
    return NextResponse.json({
      exists: null,
      isBusiness: null,
      message: 'Email check unavailable',
    });
  }
}
