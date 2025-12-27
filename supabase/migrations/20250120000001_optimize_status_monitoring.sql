-- ================================
-- 📊 OPTIMIZE STATUS MONITORING
-- ================================

-- Add index on health_checks status for faster filtering
create index if not exists idx_health_checks_status on public.health_checks(status);

-- Add composite index for common query pattern
create index if not exists idx_health_checks_service_status_checked 
  on public.health_checks(service_name, status, checked_at desc);

-- Create daily uptime summary table for faster historical queries
create table if not exists public.daily_uptime_summary (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  summary_date date not null,
  total_checks integer default 0,
  operational_checks integer default 0,
  degraded_checks integer default 0,
  down_checks integer default 0,
  uptime_percentage numeric(5,2) default 100.00,
  avg_response_time numeric(10,2),
  min_response_time numeric(10,2),
  max_response_time numeric(10,2),
  incident_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(service_name, summary_date)
);

-- Index for daily summary
create index if not exists idx_daily_uptime_service_date 
  on public.daily_uptime_summary(service_name, summary_date desc);

-- Enable RLS on daily summary
alter table public.daily_uptime_summary enable row level security;

-- Allow public read access
create policy "Allow public read access to daily_uptime_summary" 
  on public.daily_uptime_summary for select using (true);

-- Allow service role to manage
create policy "Allow service role to manage daily_uptime_summary" 
  on public.daily_uptime_summary for all using (true);

-- Function to aggregate daily uptime (run at end of day via cron)
create or replace function aggregate_daily_uptime(p_date date default current_date - 1)
returns void
language plpgsql
as $$
declare
  v_service_name text;
  v_services text[] := ARRAY['Database', 'Storage', 'API'];
begin
  foreach v_service_name in array v_services
  loop
    insert into public.daily_uptime_summary (
      service_name,
      summary_date,
      total_checks,
      operational_checks,
      degraded_checks,
      down_checks,
      uptime_percentage,
      avg_response_time,
      min_response_time,
      max_response_time,
      incident_count
    )
    select
      v_service_name,
      p_date,
      count(*),
      count(*) filter (where status = 'operational'),
      count(*) filter (where status = 'degraded'),
      count(*) filter (where status = 'down'),
      round(
        (count(*) filter (where status = 'operational')::numeric / nullif(count(*), 0) * 100),
        2
      ),
      avg(response_time),
      min(response_time),
      max(response_time),
      (
        select count(*) 
        from public.incidents 
        where v_service_name = any(affected_services)
          and started_at::date = p_date
      )
    from public.health_checks
    where service_name = v_service_name
      and checked_at::date = p_date
    on conflict (service_name, summary_date)
    do update set
      total_checks = excluded.total_checks,
      operational_checks = excluded.operational_checks,
      degraded_checks = excluded.degraded_checks,
      down_checks = excluded.down_checks,
      uptime_percentage = excluded.uptime_percentage,
      avg_response_time = excluded.avg_response_time,
      min_response_time = excluded.min_response_time,
      max_response_time = excluded.max_response_time,
      incident_count = excluded.incident_count,
      updated_at = now();
  end loop;
end;
$$;

-- Function to clean up old health checks (keep last 90 days)
create or replace function cleanup_old_health_checks()
returns integer
language plpgsql
as $$
declare
  deleted_count integer;
begin
  delete from public.health_checks
  where checked_at < now() - interval '90 days';
  
  get diagnostics deleted_count = row_count;
  
  return deleted_count;
end;
$$;

-- Function to clean up old service metrics (keep last 90 days)
create or replace function cleanup_old_service_metrics()
returns integer
language plpgsql
as $$
declare
  deleted_count integer;
begin
  delete from public.service_metrics
  where metric_date < current_date - 90;
  
  get diagnostics deleted_count = row_count;
  
  return deleted_count;
end;
$$;

-- Create a combined cleanup function
create or replace function run_status_maintenance()
returns json
language plpgsql
as $$
declare
  health_deleted integer;
  metrics_deleted integer;
begin
  -- Aggregate yesterday's data first
  perform aggregate_daily_uptime(current_date - 1);
  
  -- Then cleanup old data
  select cleanup_old_health_checks() into health_deleted;
  select cleanup_old_service_metrics() into metrics_deleted;
  
  return json_build_object(
    'health_checks_deleted', health_deleted,
    'metrics_deleted', metrics_deleted,
    'aggregation_date', current_date - 1
  );
end;
$$;

-- Note: To set up automatic maintenance, create a pg_cron job:
-- SELECT cron.schedule('status-maintenance', '0 1 * * *', 'SELECT run_status_maintenance()');
-- This runs daily at 1 AM
