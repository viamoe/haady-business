import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Public API route for fetching business_role_enum values
 * No authentication required - uses anonymous key for public access
 */
export async function GET() {
  try {
    // Create a public Supabase client using anonymous key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    
    // Try to call the RPC function to get enum values
    let roles: any[] = []
    let error: any = null
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_business_role_enum_values')
      if (rpcError) {
        error = rpcError
        console.warn('RPC function get_business_role_enum_values not found or failed:', rpcError.message)
      } else {
        roles = data || []
      }
    } catch (rpcErr: any) {
      error = rpcErr
      console.warn('Error calling get_business_role_enum_values:', rpcErr.message)
    }

    // If RPC function doesn't exist or enum doesn't exist, return default roles
    if (error || !roles || roles.length === 0) {
      console.log('Using default business roles as fallback')
      // Return default roles based on common business role enum values
      const defaultRoles = [
        { value: 'owner' },
        { value: 'manager' },
        { value: 'employee' },
        { value: 'admin' },
        { value: 'staff' },
      ]
      return NextResponse.json(
        { roles: defaultRoles },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      )
    }

    // RPC returns array of objects with 'value' property or array of strings
    const roleValues = (roles || []).map((item: { value: string } | string) => 
      typeof item === 'string' ? { value: item } : item
    )

    return NextResponse.json(
      { roles: roleValues },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in business-roles API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

