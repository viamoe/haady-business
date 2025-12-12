import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * POST /api/auth/create-public-user
 * Creates a public.users record for the authenticated user if it doesn't exist
 * This is called after OTP verification or OAuth signup
 */
export async function POST(request: Request) {
  try {
    // Get the authenticated user from the request
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body for optional user data
    let fullName: string | null = null;
    let avatarUrl: string | null = null;
    let preferredLanguage: string = 'en';

    try {
      const body = await request.json();
      fullName = body.full_name || null;
      avatarUrl = body.avatar_url || null;
      preferredLanguage = body.preferred_language || 'en';
    } catch {
      // Body is optional
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Check if user already exists in public.users
    const { data: existingUser, error: checkError } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return NextResponse.json(
        { error: 'Failed to check user existence' },
        { status: 500 }
      );
    }

    if (existingUser) {
      // User already exists, optionally update with new data
      if (fullName || avatarUrl) {
        const updateData: { full_name?: string; avatar_url?: string; preferred_language?: string } = {};
        if (fullName) updateData.full_name = fullName;
        if (avatarUrl) updateData.avatar_url = avatarUrl;
        if (preferredLanguage) updateData.preferred_language = preferredLanguage;

        await adminClient
          .from('users')
          .update(updateData)
          .eq('id', user.id);
      }

      return NextResponse.json({
        success: true,
        message: 'User already exists',
        isNew: false,
        userId: user.id,
      });
    }

    // Create new public.users record
    // Only include fields that exist in the table and have values
    // Skip country field as it may have enum constraints
    const insertData: {
      id: string;
      full_name?: string | null;
      avatar_url?: string | null;
      preferred_language?: string;
    } = {
      id: user.id,
    };

    if (fullName) insertData.full_name = fullName;
    if (avatarUrl) insertData.avatar_url = avatarUrl;
    if (preferredLanguage) insertData.preferred_language = preferredLanguage;

    const { data: newUser, error: createError } = await adminClient
      .from('users')
      .insert(insertData)
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating public.users record:', {
        error: createError,
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code,
      });
      return NextResponse.json(
        { error: 'Failed to create user record', details: createError.message },
        { status: 500 }
      );
    }

    console.log('Successfully created public.users record:', newUser?.id);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      isNew: true,
      userId: newUser?.id,
    });

  } catch (error) {
    console.error('Unexpected error in create-public-user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

