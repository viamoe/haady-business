import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/check-email
 * Check if an email already exists as a merchant user
 * Returns whether user should login or signup
 */
export async function POST(request: Request) {
  try {
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
        isMerchant: null,
        message: 'Email check unavailable',
      });
    }

    const adminClient = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in auth.users (handle pagination)
    let authUser = null;
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (listError) {
        console.error('Error listing users:', listError);
        return NextResponse.json({
          exists: null,
          isMerchant: null,
          message: 'Email check unavailable',
        });
      }

      authUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);
      
      // If found or no more users, break
      if (authUser || users.length === 0) {
        break;
      }
      
      // If we got less than perPage, we've reached the end
      if (users.length < perPage) {
        break;
      }
      
      page++;
    }

    if (!authUser) {
      // No auth user exists - user should signup
      return NextResponse.json({
        exists: false,
        isMerchant: false,
        shouldLogin: false,
        shouldSignup: true,
      });
    }

    // Check if user has a merchant_user record
    const { data: merchantUser, error: checkError } = await adminClient
      .from('merchant_users')
      .select('id, merchant_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking merchant user:', checkError);
      return NextResponse.json({
        exists: null,
        isMerchant: null,
        message: 'Email check unavailable',
      });
    }

    if (merchantUser) {
      // User exists as merchant - should login
      return NextResponse.json({
        exists: true,
        isMerchant: true,
        shouldLogin: true,
        shouldSignup: false,
        message: 'You already have a Haady Business account. Please log in instead.',
      });
    }

    // Auth user exists but not as merchant - could be consumer app user
    // Still allow signup, but suggest login
    return NextResponse.json({
      exists: true,
      isMerchant: false,
      shouldLogin: true,
      shouldSignup: false,
      message: 'An account with this email already exists. Please log in instead.',
    });
  } catch (error: any) {
    console.error('Error checking email:', error);
    // Return unknown status on error - don't block user
    return NextResponse.json({
      exists: null,
      isMerchant: null,
      message: 'Email check unavailable',
    });
  }
}
