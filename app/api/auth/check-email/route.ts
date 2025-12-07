import { NextResponse } from 'next/server';

/**
 * POST /api/auth/check-email
 * Check if an email already exists in the system
 * Uses admin API to check without sending OTP
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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // If service role key is not available, return unknown status
    // This allows graceful degradation - user can still proceed
    if (!url || !serviceRoleKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not configured - skipping email check');
      return NextResponse.json({
        exists: null, // Unknown - let user proceed
        message: 'Email check unavailable',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Use Supabase Admin API directly via REST
    const response = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Error fetching users:', response.status, response.statusText);
      // Return unknown status on error - don't block user
      return NextResponse.json({
        exists: null,
        message: 'Email check unavailable',
      });
    }

    const data = await response.json();
    const users = data.users || [];
    
    // Find user by email
    const authUser = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

    if (authUser) {
      return NextResponse.json({
        exists: true,
        message: 'You already have a Haady account. Please log in instead.',
      });
    }

    // Email doesn't exist
    return NextResponse.json({
      exists: false,
    });
  } catch (error: any) {
    console.error('Error checking email:', error);
    // Return unknown status on error - don't block user
    return NextResponse.json({
      exists: null,
      message: 'Email check unavailable',
    });
  }
}
