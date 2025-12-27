# Status Page Implementation - Real Data

This document describes the implementation of the real-time status page with actual data tracking.

## Overview

The status page now tracks and displays real data from the platform:
- **Real-time health checks**: Database, Storage, and API connectivity
- **Historical uptime**: Calculated from actual health check records
- **Service metrics**: Request counts, response times, error rates
- **Incident tracking**: Real incidents stored in the database

## Database Schema

### Tables Created

1. **`health_checks`**: Stores individual health check results
   - `service_name`: Name of the service (Database, Storage, API)
   - `status`: Current status (operational, degraded, down, maintenance)
   - `response_time`: Response time in milliseconds
   - `message`: Optional error message
   - `checked_at`: Timestamp of the check

2. **`incidents`**: Tracks platform incidents
   - `title`: Incident title
   - `description`: Detailed description
   - `status`: Current status (resolved, investigating, monitoring)
   - `severity`: Severity level (minor, major, critical)
   - `affected_services`: Array of affected service names
   - `started_at`: When the incident started
   - `resolved_at`: When the incident was resolved (if applicable)

3. **`service_metrics`**: Daily aggregated metrics per service
   - `service_name`: Name of the service
   - `metric_date`: Date of the metrics
   - `total_requests`: Total number of requests
   - `successful_requests`: Number of successful requests
   - `failed_requests`: Number of failed requests
   - `average_response_time`: Average response time
   - `min_response_time`: Minimum response time
   - `max_response_time`: Maximum response time
   - `p95_response_time`: 95th percentile response time
   - `p99_response_time`: 99th percentile response time

### Functions

- **`update_service_metrics`**: Automatically updates service metrics when called with a new request/response time

## Setup Instructions

### 1. Run the Migration

Run the migration file in your Supabase database:

```sql
-- File: supabase/migrations/20250120000000_create_status_monitoring_tables.sql
```

You can run this via:
- Supabase Dashboard → SQL Editor
- Supabase CLI: `supabase db push`
- Or manually copy and paste the SQL

### 2. Verify RLS Policies

The migration creates Row Level Security (RLS) policies that allow:
- **Public read access** to all status tables (for the status page)
- **Service role write access** (for API routes to insert data)

### 3. Environment Variables

Ensure you have the following environment variables set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## API Routes

### `/api/health`
- **Method**: GET
- **Purpose**: Performs real-time health checks and stores results
- **Returns**: Current status of all services
- **Side Effects**: Inserts health check records and updates metrics

### `/api/health/history`
- **Method**: GET
- **Purpose**: Returns historical uptime data
- **Query Parameters**: `days` (default: 30)
- **Returns**: Uptime history and incident counts per day

### `/api/health/incidents`
- **Method**: GET
- **Purpose**: Returns list of incidents
- **Returns**: Array of incidents sorted by start date

### `/api/health/metrics`
- **Method**: GET
- **Purpose**: Returns service metrics (uptime, response times, request counts, error rates)
- **Query Parameters**: `service` (optional, to filter by service name)
- **Returns**: Service metrics for the last 30 days

## How It Works

### Health Check Flow

1. When `/api/health` is called:
   - Checks Database connectivity (queries `business_profile` table)
   - Checks Storage connectivity (lists `assets` bucket)
   - Measures API response time
   - Stores each check result in `health_checks` table
   - Updates `service_metrics` via RPC function

2. The status page auto-refreshes every 30 seconds, calling:
   - `/api/health` for current status
   - `/api/health/history` for uptime chart
   - `/api/health/incidents` for incident list
   - `/api/health/metrics` for detailed service metrics

### Data Collection

- **Health checks** are stored every time the `/api/health` endpoint is called
- **Service metrics** are automatically aggregated daily
- **Incidents** must be manually created (see below)

## Creating Incidents

To create an incident, insert a record into the `incidents` table:

```sql
INSERT INTO public.incidents (
  title,
  description,
  status,
  severity,
  affected_services,
  started_at
) VALUES (
  'Database connection timeout',
  'Brief connection timeout affecting some API requests',
  'investigating',
  'minor',
  ARRAY['Database', 'API'],
  NOW()
);
```

To resolve an incident:

```sql
UPDATE public.incidents
SET 
  status = 'resolved',
  resolved_at = NOW(),
  updated_at = NOW()
WHERE id = 'incident-id';
```

## Future Enhancements

Potential improvements:

1. **Automated Incident Detection**: Create incidents automatically when services go down
2. **Alerting**: Send notifications when incidents occur
3. **External Monitoring Integration**: 
   - UptimeRobot webhook integration
   - StatusPage.io API integration
   - Datadog metrics integration
   - Sentry error tracking integration
4. **More Granular Metrics**: Track metrics per endpoint, per hour, etc.
5. **SLA Tracking**: Calculate and display SLA compliance
6. **Maintenance Windows**: Schedule and track maintenance periods

## Monitoring External Services

To integrate with external monitoring services:

1. **UptimeRobot**: Set up webhooks that POST to a new endpoint that creates incidents
2. **StatusPage.io**: Use their API to sync incidents
3. **Datadog**: Create a webhook receiver that processes Datadog alerts
4. **Sentry**: Use Sentry webhooks to create incidents from error spikes

Example webhook endpoint structure:

```typescript
// app/api/health/webhooks/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  // Parse external service data
  // Create incident in database
  // Return success
}
```

## Notes

- Health checks are performed server-side using the admin client (bypasses RLS)
- Historical data is calculated from stored health checks
- Metrics are aggregated daily, but can be queried in real-time
- The status page is publicly accessible (no authentication required)
