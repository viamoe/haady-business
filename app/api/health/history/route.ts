import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface UptimeData {
  date: string;
  uptime: number; // percentage
  incidents: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  try {
    const adminClient = createAdminClient();
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    // Fetch health checks for the period
    const { data: healthChecks, error: healthError } = await adminClient
      .from('health_checks')
      .select('service_name, status, checked_at')
      .gte('checked_at', startDate.toISOString())
      .order('checked_at', { ascending: true });

    if (healthError) {
      console.error('Error fetching health checks:', healthError);
    }

    // Fetch incidents for the period
    const { data: incidents, error: incidentsError } = await adminClient
      .from('incidents')
      .select('started_at, resolved_at')
      .gte('started_at', startDate.toISOString());

    if (incidentsError) {
      console.error('Error fetching incidents:', incidentsError);
    }

    // Calculate uptime per day
    const uptimeHistory: UptimeData[] = [];
    const serviceNames = ['Database', 'Storage', 'API'];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Get health checks for this date
      const dayChecks = healthChecks?.filter(hc => {
        const checkDate = new Date(hc.checked_at).toISOString().split('T')[0];
        return checkDate === dateStr;
      }) || [];

      // Calculate uptime percentage for the day
      const totalChecks = dayChecks.length;
      const operationalChecks = dayChecks.filter(hc => hc.status === 'operational').length;
      const uptime = totalChecks > 0 ? (operationalChecks / totalChecks) * 100 : 99.9;

      // Count incidents for this date
      const dayIncidents = incidents?.filter(inc => {
        const incidentDate = new Date(inc.started_at).toISOString().split('T')[0];
        return incidentDate === dateStr;
      }).length || 0;

      uptimeHistory.push({
        date: dateStr,
        uptime: Math.max(95, Math.min(100, uptime)), // Clamp between 95-100%
        incidents: dayIncidents,
      });
    }

    const averageUptime = uptimeHistory.length > 0
      ? uptimeHistory.reduce((sum, d) => sum + d.uptime, 0) / uptimeHistory.length
      : 99.9;

    const totalIncidents = incidents?.length || 0;

    return NextResponse.json({
      history: uptimeHistory,
      averageUptime,
      totalIncidents,
    });
  } catch (error) {
    console.error('Error fetching uptime history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch uptime history' },
      { status: 500 }
    );
  }
}
