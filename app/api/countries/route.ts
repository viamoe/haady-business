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
    
    // Try 'countries_master' table first (as per schema), fallback to 'countries'
    // Fetch only active countries (is_active=true) including flag_url
    let { data: countries, error } = await supabase
      .from('countries_master')
      .select('id, name, iso2, iso3, phone_code, flag_url')
      .eq('is_active', true)
      .order('name', { ascending: true });

    // If is_active column doesn't exist, try without the filter
    if (error && error.message?.includes('is_active')) {
      console.log('is_active column not found in countries_master, fetching all countries');
      const { data: allCountries, error: allError } = await supabase
        .from('countries_master')
        .select('id, name, iso2, iso3, phone_code, flag_url')
        .order('name', { ascending: true });
      
      if (allError) {
        console.log('Error with countries_master table, trying countries:', allError.message);
        error = allError; // Continue to fallback
      } else {
        countries = allCountries;
        error = null;
      }
    }

    if (error) {
      console.log('Error with countries_master table, trying countries:', error.message);
      // If 'countries_master' table doesn't exist, try 'countries'
      // Also try without is_active filter in case column doesn't exist
      let { data: countriesTable, error: countriesError } = await supabase
        .from('countries')
        .select('id, name, iso2, iso3, phone_code, flag_url')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      // If is_active column doesn't exist, fetch all countries
      if (countriesError && countriesError.message?.includes('is_active')) {
        console.log('is_active column not found, fetching all countries');
        const { data: allCountries, error: allError } = await supabase
          .from('countries')
          .select('id, name, iso2, iso3, phone_code, flag_url')
          .order('name', { ascending: true });
        
        if (allError) {
          console.error('Error fetching countries from countries table:', allError);
          return NextResponse.json(
            { error: 'Failed to fetch countries', details: allError.message },
            { status: 500 }
          );
        }
        
        countriesTable = allCountries;
        countriesError = null;
      }

      if (countriesError) {
        console.error('Error fetching countries from both tables:', countriesError);
        return NextResponse.json(
          { error: 'Failed to fetch countries', details: countriesError.message },
          { status: 500 }
        );
      }

      console.log('Countries fetched from countries table:', countriesTable?.length || 0);
      return NextResponse.json(
        { countries: countriesTable || [] },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    console.log('Countries fetched from countries_master table:', countries?.length || 0);
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

