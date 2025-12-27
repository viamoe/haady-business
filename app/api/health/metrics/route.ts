import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ServiceMetrics {
  name: string;
  uptime: number;
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
  lastIncident?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceName = searchParams.get('service');

  try {
    const adminClient = createAdminClient();
    const serviceNames = serviceName ? [serviceName] : ['Database', 'Storage', 'API'];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // Fetch all data in parallel for all services
    const [metricsResult, healthChecksResult, incidentsResult] = await Promise.all([
      // Get all service metrics in one query
      adminClient
        .from('service_metrics')
        .select('service_name, total_requests, failed_requests, average_response_time')
        .in('service_name', serviceNames)
        .gte('metric_date', thirtyDaysAgoStr),
      
      // Get all health checks with status counts using a single query
      adminClient
        .from('health_checks')
        .select('service_name, status')
        .in('service_name', serviceNames)
        .gte('checked_at', thirtyDaysAgoISO),
      
      // Get last incidents for all services
      adminClient
        .from('incidents')
        .select('affected_services, started_at')
        .gte('started_at', thirtyDaysAgoISO)
        .order('started_at', { ascending: false }),
    ]);

    // Process data for each service
    const metrics: ServiceMetrics[] = serviceNames.map(name => {
      // Calculate metrics from aggregated data
      const serviceMetricsData = metricsResult.data?.filter(m => m.service_name === name) || [];
      const healthChecksData = healthChecksResult.data?.filter(h => h.service_name === name) || [];
      
      // Calculate uptime
      const totalChecks = healthChecksData.length;
      const operationalChecks = healthChecksData.filter(h => h.status === 'operational').length;
      const uptime = totalChecks > 0 ? (operationalChecks / totalChecks) * 100 : 99.9;

      // Calculate totals
      const totalRequests = serviceMetricsData.reduce((sum, m) => sum + (m.total_requests || 0), 0);
      const failedRequests = serviceMetricsData.reduce((sum, m) => sum + (m.failed_requests || 0), 0);
      const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

      // Calculate average response time
      const avgResponseTime = serviceMetricsData.length > 0
        ? serviceMetricsData.reduce((sum, m) => sum + (parseFloat(m.average_response_time) || 0), 0) / serviceMetricsData.length
        : 0;

      // Find last incident for this service
      const lastIncident = incidentsResult.data?.find(inc => 
        inc.affected_services?.includes(name)
      );

      return {
        name,
        uptime: Math.max(95, Math.min(100, uptime)),
        averageResponseTime: Math.round(avgResponseTime),
        totalRequests,
        errorRate: Math.round(errorRate * 100) / 100,
        lastIncident: lastIncident?.started_at || undefined,
      };
    });

    return NextResponse.json({
      metrics: serviceName ? metrics[0] : metrics,
    });
  } catch (error) {
    console.error('Error fetching service metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service metrics' },
      { status: 500 }
    );
  }
}
