import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getLocalizedUrlFromRequest } from '@/lib/localized-url';
import { createAdminClient } from '@/lib/supabase/admin';

function validateRedirectUrl(url: string, origin: string): string {
  try {
    const urlObj = new URL(url, origin);
    if (urlObj.origin !== origin) {
      return '/dashboard';
    }
    const allowedPaths = ['/dashboard', '/setup'];
    if (allowedPaths.some(path => urlObj.pathname.startsWith(path))) {
      return urlObj.pathname + urlObj.search;
    }
    return '/dashboard';
  } catch {
    return '/dashboard';
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const appType = requestUrl.searchParams.get('app_type');
  const preferredCountry = requestUrl.searchParams.get('preferred_country') || 'AE';
  const preferredLanguage = requestUrl.searchParams.get('preferred_language') || 'en';
  
  if (!code) {
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
  }

  const cookieStore = await cookies();
  
  const cookiesToSetOnResponse: Array<{ name: string; value: string; options: any }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToSetOnResponse.push({ name, value, options });
          });
        },
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    console.error('Error exchanging code for session:', error);
    const authUrl = new URL('/auth/login', requestUrl.origin);
    authUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(authUrl);
  }
  
  if (!session || !session.user) {
    console.error('No session or user after code exchange');
    const authUrl = new URL('/auth/login', requestUrl.origin);
    authUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(authUrl);
  }

  // Extract full name from Google OAuth user metadata
  const userFullName = session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name ||
                       null;
  
  // Extract avatar URL from Google OAuth
  const userAvatarUrl = session.user.user_metadata?.avatar_url ||
                        session.user.user_metadata?.picture ||
                        null;

  if (appType === 'merchant' && session.user) {
    await supabase.auth.updateUser({
      data: {
        app_type: 'merchant',
        preferred_country: preferredCountry,
        preferred_language: preferredLanguage,
      },
    });
  }

  // Create or update public.users record for Google OAuth signups
  // Use admin client to bypass RLS policies
  if (session.user) {
    try {
      const adminClient = createAdminClient();
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await adminClient
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing user:', checkError);
      }

      if (!existingUser) {
        // Create new public.users record
        console.log('Creating public.users record for new Google OAuth user:', session.user.id);
        
        // Only include fields that exist in the table and have values
        // Skip country field as it may have enum constraints
        const insertData: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_language?: string;
        } = {
          id: session.user.id,
        };
        
        if (userFullName) insertData.full_name = userFullName;
        if (userAvatarUrl) insertData.avatar_url = userAvatarUrl;
        if (preferredLanguage) insertData.preferred_language = preferredLanguage;

        const { data: newUser, error: userCreateError } = await adminClient
          .from('users')
          .insert(insertData)
          .select('id')
          .single();

        if (userCreateError) {
          console.error('Error creating public.users record:', {
            error: userCreateError,
            message: userCreateError.message,
            details: userCreateError.details,
            hint: userCreateError.hint,
            code: userCreateError.code,
          });
        } else {
          console.log('Successfully created public.users record:', newUser?.id);
        }
      } else if (userFullName || userAvatarUrl) {
        // Update existing user with Google profile data
        console.log('Updating existing public.users record with Google data');
        const updateData: { full_name?: string; avatar_url?: string; preferred_language?: string } = {};
        if (userFullName) updateData.full_name = userFullName;
        if (userAvatarUrl) updateData.avatar_url = userAvatarUrl;
        if (preferredLanguage) updateData.preferred_language = preferredLanguage;

        if (Object.keys(updateData).length > 0) {
          const { error: userUpdateError } = await adminClient
            .from('users')
            .update(updateData)
            .eq('id', session.user.id);

          if (userUpdateError) {
            console.error('Error updating public.users record:', {
              error: userUpdateError,
              message: userUpdateError.message,
              details: userUpdateError.details,
            });
          } else {
            console.log('Successfully updated public.users record');
          }
        }
      } else {
        console.log('public.users record already exists, no update needed');
      }
    } catch (error) {
      console.error('Unexpected error creating/updating public.users record:', error);
    }
  }

  let { data: merchantUser, error: merchantError } = await supabase
    .from('merchant_users')
    .select('merchant_id, full_name')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();

  if (!merchantUser && !merchantError && appType === 'merchant') {
    console.log('Creating merchant_user record for new Google OAuth user');
    
    const { data: newMerchantUser, error: createError } = await supabase
      .from('merchant_users')
      .insert({
        auth_user_id: session.user.id,
        merchant_id: null,
        role: 'manager',
        preferred_country: preferredCountry,
        preferred_language: preferredLanguage,
        full_name: userFullName,
        is_primary_contact: true,
      })
      .select('merchant_id, full_name')
      .single();

    if (createError) {
      console.error('Error creating merchant_user:', createError);
    } else {
      merchantUser = newMerchantUser;
      console.log('Successfully created merchant_user record with full_name:', userFullName);
    }
  } else if (merchantUser && userFullName && !merchantUser.full_name) {
    // Update existing merchant_user with full_name if it's missing
    console.log('Updating merchant_user with full_name from Google OAuth');
    const { error: updateError } = await supabase
      .from('merchant_users')
      .update({ full_name: userFullName })
      .eq('auth_user_id', session.user.id);

    if (updateError) {
      console.error('Error updating merchant_user full_name:', updateError);
    } else {
      console.log('Successfully updated merchant_user full_name:', userFullName);
    }
  }

  let redirectPath: string;
  if (merchantUser && merchantUser.merchant_id) {
    redirectPath = validateRedirectUrl(nextParam || '/dashboard', requestUrl.origin);
  } else {
    redirectPath = '/setup';
  }
  
  const redirectUrl = new URL(
    getLocalizedUrlFromRequest(redirectPath, {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name);
          return cookie ? { value: cookie.value } : undefined;
        }
      }
    }),
    requestUrl.origin
  );

  const response = NextResponse.redirect(redirectUrl);
  
  cookiesToSetOnResponse.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: options?.httpOnly ?? true,
      path: '/',
    });
  });

  return response;
}

