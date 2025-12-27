-- ================================
-- 📊 STATUS MONITORING TABLES
-- ================================

-- Enable UUID extension (if needed)
create extension if not exists "uuid-ossp";

-- Create enum for service status
create type service_status_enum as enum ('operational', 'degraded', 'down', 'maintenance');
create type incident_status_enum as enum ('resolved', 'investigating', 'monitoring');
create type incident_severity_enum as enum ('minor', 'major', 'critical');

-- Health checks history table
create table public.health_checks (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  status service_status_enum not null,
  response_time integer, -- in milliseconds
  message text,
  checked_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Create index for efficient queries
create index idx_health_checks_service_checked on public.health_checks(service_name, checked_at desc);
create index idx_health_checks_checked_at on public.health_checks(checked_at desc);

-- Incidents table
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  status incident_status_enum not null default 'investigating',
  severity incident_severity_enum not null default 'minor',
  affected_services text[] not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for incidents
create index idx_incidents_started_at on public.incidents(started_at desc);
create index idx_incidents_status on public.incidents(status);

-- Service metrics table (for tracking request counts, error rates, etc.)
create table public.service_metrics (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  metric_date date not null,
  total_requests bigint default 0,
  successful_requests bigint default 0,
  failed_requests bigint default 0,
  average_response_time numeric(10,2),
  min_response_time numeric(10,2),
  max_response_time numeric(10,2),
  p95_response_time numeric(10,2),
  p99_response_time numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(service_name, metric_date)
);

-- Create index for service metrics
create index idx_service_metrics_service_date on public.service_metrics(service_name, metric_date desc);

-- Function to update service metrics
create or replace function update_service_metrics(
  p_service_name text,
  p_response_time numeric,
  p_success boolean
)
returns void
language plpgsql
as $$
begin
  insert into public.service_metrics (
    service_name,
    metric_date,
    total_requests,
    successful_requests,
    failed_requests,
    average_response_time,
    min_response_time,
    max_response_time
  )
  values (
    p_service_name,
    current_date,
    1,
    case when p_success then 1 else 0 end,
    case when p_success then 0 else 1 end,
    p_response_time,
    p_response_time,
    p_response_time
  )
  on conflict (service_name, metric_date)
  do update set
    total_requests = service_metrics.total_requests + 1,
    successful_requests = service_metrics.successful_requests + case when p_success then 1 else 0 end,
    failed_requests = service_metrics.failed_requests + case when p_success then 0 else 1 end,
    average_response_time = (
      (service_metrics.average_response_time * service_metrics.total_requests + p_response_time) / 
      (service_metrics.total_requests + 1)
    ),
    min_response_time = least(service_metrics.min_response_time, p_response_time),
    max_response_time = greatest(service_metrics.max_response_time, p_response_time),
    updated_at = now();
end;
$$;

-- Enable Row Level Security
alter table public.health_checks enable row level security;
alter table public.incidents enable row level security;
alter table public.service_metrics enable row level security;

-- Create policies (allow public read access for status page)
create policy "Allow public read access to health_checks" on public.health_checks
  for select using (true);

create policy "Allow public read access to incidents" on public.incidents
  for select using (true);

create policy "Allow public read access to service_metrics" on public.service_metrics
  for select using (true);

-- Allow service to insert health checks (you'll need to set up service role)
create policy "Allow service role to insert health_checks" on public.health_checks
  for insert with check (true);

create policy "Allow service role to update service_metrics" on public.service_metrics
  for all using (true);

create policy "Allow service role to manage incidents" on public.incidents
  for all using (true);
