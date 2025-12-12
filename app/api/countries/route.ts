import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    
    // Try 'countries_master' table first (as per schema), fallback to 'countries'
    // Fetch ALL countries from the database (no hardcoded filter)
    let { data: countries, error } = await supabase
      .from('countries_master')
      .select('id, name, iso2, iso3, phone_code')
      .order('name', { ascending: true });

    if (error) {
      console.log('Error with countries_master table, trying countries:', error.message);
      // If 'countries_master' table doesn't exist, try 'countries'
      const { data: countriesTable, error: countriesError } = await supabase
        .from('countries')
        .select('id, name, iso2, iso3, phone_code')
        .order('name', { ascending: true });

      if (countriesError) {
        console.error('Error fetching countries from both tables:', countriesError);
        return NextResponse.json(
          { error: 'Failed to fetch countries', details: countriesError.message },
          { status: 500 }
        );
      }

      console.log('Countries fetched from countries table:', countriesTable?.length || 0);
      return NextResponse.json({ countries: countriesTable || [] });
    }

    console.log('Countries fetched from countries_master table:', countries?.length || 0);
    return NextResponse.json({ countries: countries || [] });
  } catch (error: any) {
    console.error('Error in countries API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

