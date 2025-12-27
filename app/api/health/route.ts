import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  responseTime?: number;
  lastChecked: string;
  message?: string;
}

export async function GET() {
  try {
    const services: ServiceStatus[] = [];
    const startTime = Date.now();
    let adminClient;
    
    try {
      adminClient = createAdminClient();
    } catch (error) {
      console.error('Failed to create admin client:', error);
      return NextResponse.json(
        {
          status: 'down',
          services: [],
          timestamp: new Date().toISOString(),
          error: 'Failed to initialize database connection',
        },
        { status: 500 }
      );
    }

    // Check Database (Supabase)
    try {
      const dbStartTime = Date.now();
      const { error } = await adminClient.from('business_profile').select('id').limit(1);
      const dbResponseTime = Date.now() - dbStartTime;
      const dbStatus: 'operational' | 'degraded' | 'down' = error ? 'degraded' : 'operational';
      
      // Store health check in database using admin client (non-blocking)
      adminClient.from('health_checks').insert({
        service_name: 'Database',
        status: dbStatus,
        response_time: dbResponseTime,
        message: error ? 'Database connection issues detected' : null,
      }).then(({ error: insertError }) => {
        if (insertError) console.error('Failed to store Database health check:', insertError);
      });

      // Update service metrics using admin client (non-blocking)
      adminClient.rpc('update_service_metrics', {
        p_service_name: 'Database',
        p_response_time: dbResponseTime,
        p_success: !error,
      }).then(({ error: rpcError }) => {
        if (rpcError) console.error('Failed to update Database metrics:', rpcError);
      });
      
      services.push({
        name: 'Database',
        status: dbStatus,
        responseTime: dbResponseTime,
        lastChecked: new Date().toISOString(),
        message: error ? 'Database connection issues detected' : undefined,
      });
    } catch (error) {
      console.error('Database health check failed:', error);
      // Store health check (non-blocking)
      adminClient.from('health_checks').insert({
        service_name: 'Database',
        status: 'down',
        message: 'Database is currently unavailable',
      }).then(({ error: insertError }) => {
        if (insertError) console.error('Failed to store Database down status:', insertError);
      });

      services.push({
        name: 'Database',
        status: 'down',
        lastChecked: new Date().toISOString(),
        message: 'Database is currently unavailable',
      });
    }

    // Check Storage (Supabase Storage)
    try {
      const storageStartTime = Date.now();
      const { error } = await adminClient.storage.from('assets').list('', { limit: 1 });
      const storageResponseTime = Date.now() - storageStartTime;
      const storageStatus: 'operational' | 'degraded' | 'down' = error ? 'degraded' : 'operational';
      
      // Store health check in database using admin client (non-blocking)
      adminClient.from('health_checks').insert({
        service_name: 'Storage',
        status: storageStatus,
        response_time: storageResponseTime,
        message: error ? 'Storage access issues detected' : null,
      }).then(({ error: insertError }) => {
        if (insertError) console.error('Failed to store Storage health check:', insertError);
      });

      // Update service metrics using admin client (non-blocking)
      adminClient.rpc('update_service_metrics', {
        p_service_name: 'Storage',
        p_response_time: storageResponseTime,
        p_success: !error,
      }).then(({ error: rpcError }) => {
        if (rpcError) console.error('Failed to update Storage metrics:', rpcError);
      });
      
      services.push({
        name: 'Storage',
        status: storageStatus,
        responseTime: storageResponseTime,
        lastChecked: new Date().toISOString(),
        message: error ? 'Storage access issues detected' : undefined,
      });
    } catch (error) {
      console.error('Storage health check failed:', error);
      // Store health check (non-blocking)
      adminClient.from('health_checks').insert({
        service_name: 'Storage',
        status: 'down',
        message: 'Storage is currently unavailable',
      }).then(({ error: insertError }) => {
        if (insertError) console.error('Failed to store Storage down status:', insertError);
      });

      services.push({
        name: 'Storage',
        status: 'down',
        lastChecked: new Date().toISOString(),
        message: 'Storage is currently unavailable',
      });
    }

    // Check API
    const apiResponseTime = Date.now() - startTime;
    // Store health check (non-blocking)
    adminClient.from('health_checks').insert({
      service_name: 'API',
      status: 'operational',
      response_time: apiResponseTime,
    }).then(({ error: insertError }) => {
      if (insertError) console.error('Failed to store API health check:', insertError);
    });

    adminClient.rpc('update_service_metrics', {
      p_service_name: 'API',
      p_response_time: apiResponseTime,
      p_success: true,
    }).then(({ error: rpcError }) => {
      if (rpcError) console.error('Failed to update API metrics:', rpcError);
    });

    services.push({
      name: 'API',
      status: 'operational',
      responseTime: apiResponseTime,
      lastChecked: new Date().toISOString(),
    });

    // Determine overall status
    const hasDown = services.some(s => s.status === 'down');
    const hasDegraded = services.some(s => s.status === 'degraded');
    
    const overallStatus = hasDown 
      ? 'down' 
      : hasDegraded 
      ? 'degraded' 
      : 'operational';

    return NextResponse.json({
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check API error:', error);
    return NextResponse.json(
      {
        status: 'down',
        services: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
