import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Public API route for fetching countries
 * No authentication required - uses anonymous key for public access
 * This endpoint can be used by any client (web, mobile, etc.)
 */
export async function GET() {
  try {
    // Create a public Supabase client using anonymous key
    // This allows public access without authentication
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
    
    // Fetch countries from 'countries' table
    // Fetch only active countries (is_active=true) including flag_url, name_ar, and currency_icon
    let { data: countries, error } = await supabase
      .from('countries')
      .select('id, name, name_ar, iso2, iso3, phone_code, flag_url, currency_icon')
      .eq('is_active', true)
      .order('name', { ascending: true });

    // If is_active column doesn't exist, try without the filter
    if (error && error.message?.includes('is_active')) {
      console.log('is_active column not found in countries table, fetching all countries');
      const { data: allCountries, error: allError } = await supabase
        .from('countries')
        .select('id, name, name_ar, iso2, iso3, phone_code, flag_url, currency_icon')
        .order('name', { ascending: true });
      
      if (allError) {
        console.error('Error fetching countries from countries table:', allError);
        return NextResponse.json(
          { error: 'Failed to fetch countries', details: allError.message },
          { status: 500 }
        );
      }
      
      countries = allCountries;
      error = null;
    }

    if (error) {
      console.error('Error fetching countries from countries table:', error);
      return NextResponse.json(
        { error: 'Failed to fetch countries', details: error.message },
        { status: 500 }
      );
    }

    console.log('Countries fetched from countries table:', countries?.length || 0);
    return NextResponse.json(
      { countries: countries || [] },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in countries API:', error);
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

