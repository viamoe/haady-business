import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'resolved' | 'investigating' | 'monitoring';
  affectedServices: string[];
  startedAt: string;
  resolvedAt?: string;
  severity: 'minor' | 'major' | 'critical';
}

export async function GET() {
  try {
    const adminClient = createAdminClient();
    // Fetch incidents from database
    const { data: incidentsData, error } = await adminClient
      .from('incidents')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50); // Limit to last 50 incidents

    if (error) {
      console.error('Error fetching incidents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch incidents' },
        { status: 500 }
      );
    }

    // Transform database records to API format
    const incidents: Incident[] = (incidentsData || []).map((inc) => ({
      id: inc.id,
      title: inc.title,
      description: inc.description,
      status: inc.status,
      affectedServices: inc.affected_services || [],
      startedAt: inc.started_at,
      resolvedAt: inc.resolved_at || undefined,
      severity: inc.severity,
    }));

    return NextResponse.json({
      incidents,
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    );
  }
}
