import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP, OTP_RATE_LIMIT } from '@/lib/rate-limit';

/**
 * POST /api/auth/send-otp
 * Rate-limited wrapper for sending OTP
 * This provides server-side rate limiting before calling Supabase
 */
export async function POST(request: Request) {
  try {
    const { email, isSignupMode } = await request.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Rate limiting: Check both IP and email to prevent abuse
    const clientIP = getClientIP(request);
    
    // Check rate limit by IP
    const ipRateLimit = checkRateLimit({
      ...OTP_RATE_LIMIT,
      identifier: `ip:${clientIP}`,
    });
    
    // Check rate limit by email (stricter for same email)
    const emailRateLimit = checkRateLimit({
      ...OTP_RATE_LIMIT,
      identifier: `email:${normalizedEmail}`,
    });
    
    // If either limit is exceeded, block the request
    if (!ipRateLimit.allowed || !emailRateLimit.allowed) {
      const retryAfter = Math.max(
        ipRateLimit.retryAfter || 0,
        emailRateLimit.retryAfter || 0
      );
      
      return NextResponse.json(
        {
          error: 'Too many OTP requests',
          message: `Please wait ${retryAfter} seconds before requesting another code.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(OTP_RATE_LIMIT.maxRequests),
            'X-RateLimit-Remaining': String(Math.min(ipRateLimit.remaining, emailRateLimit.remaining)),
            'X-RateLimit-Reset': String(Math.max(ipRateLimit.resetTime, emailRateLimit.resetTime)),
          },
        }
      );
    }
    
    // Rate limit passed, proceed with OTP sending via Supabase
    // Note: The actual OTP sending is done client-side via supabase.auth.signInWithOtp()
    // This endpoint just validates rate limits
    // In a full implementation, you could call Supabase here, but for now we'll return success
    // and let the client handle the actual OTP sending
    
    return NextResponse.json({
      success: true,
      message: 'Rate limit check passed. You can proceed with OTP request.',
      remaining: Math.min(ipRateLimit.remaining, emailRateLimit.remaining),
    });
  } catch (error: any) {
    console.error('Error in send-otp endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while processing your request.',
      },
      { status: 500 }
    );
  }
}

