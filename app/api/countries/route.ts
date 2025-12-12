import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    
    // Try 'countries' table first, fallback to 'countries_master'
    // Fetch ALL countries from the database (no hardcoded filter)
    let { data: countries, error } = await supabase
      .from('countries')
      .select('id, name, name_ar, iso2, iso3, phone_code')
      .order('name', { ascending: true });

    if (error) {
      console.log('Error with countries table, trying countries_master:', error.message);
      // If 'countries' table doesn't exist, try 'countries_master'
      const { data: countriesMaster, error: masterError } = await supabase
        .from('countries_master')
        .select('id, name, name_ar, iso2, iso3, phone_code')
        .order('name', { ascending: true });

      if (masterError) {
        console.error('Error fetching countries from countries_master:', masterError);
        return NextResponse.json(
          { error: 'Failed to fetch countries', details: masterError.message },
          { status: 500 }
        );
      }

      console.log('Countries fetched from countries_master:', countriesMaster?.length || 0);
      return NextResponse.json({ countries: countriesMaster || [] });
    }

    console.log('Countries fetched from countries table:', countries?.length || 0);
    return NextResponse.json({ countries: countries || [] });
  } catch (error: any) {
    console.error('Error in countries API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

