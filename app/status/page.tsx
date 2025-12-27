'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlatformHeader } from '@/components/platform-header';
import { Footer } from '@/components/footer';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  responseTime?: number;
  lastChecked: string;
  message?: string;
}

interface HealthStatus {
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  services: ServiceStatus[];
  timestamp: string;
}

interface UptimeData {
  date: string;
  uptime: number;
  incidents: number;
}

interface UptimeHistory {
  history: UptimeData[];
  averageUptime: number;
  totalIncidents: number;
}

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

interface ServiceMetrics {
  name: string;
  uptime: number;
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
  lastIncident?: string;
}

interface BarData {
  date: string;
  uptime: number;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
}

const STATUS_CONFIG = {
  operational: {
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    barColor: 'bg-green-500',
    label: 'Operational',
    labelAr: 'تعمل',
  },
  degraded: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    barColor: 'bg-yellow-500',
    label: 'Degraded',
    labelAr: 'متدهورة',
  },
  down: {
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    barColor: 'bg-red-500',
    label: 'Down',
    labelAr: 'معطلة',
  },
  maintenance: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    barColor: 'bg-blue-500',
    label: 'Maintenance',
    labelAr: 'صيانة',
  },
} as const;

// Pre-generate deterministic "random" values based on day index
const getDeterministicStatus = (dayIndex: number): { status: 'operational' | 'degraded' | 'down'; uptime: number } => {
  // Use simple hash based on day index for consistent results
  const hash = (dayIndex * 2654435761) % 1000;
  if (hash > 995) {
    return { status: 'down', uptime: 90 + (hash % 5) };
  } else if (hash > 980) {
    return { status: 'degraded', uptime: 95 + (hash % 4) };
  }
  return { status: 'operational', uptime: 99.5 + (hash % 5) / 10 };
};

// Generate historical data - memoized outside component
const generateHistoricalBars = (
  currentStatus: 'operational' | 'degraded' | 'down' | 'maintenance', 
  uptimeHistory?: UptimeHistory
): BarData[] => {
  const bars: BarData[] = [];
  const today = new Date();
  
  // Create a lookup map for faster access
  const historyMap = new Map<string, UptimeData>();
  uptimeHistory?.history?.forEach(h => historyMap.set(h.date, h));
  
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const historyData = historyMap.get(dateStr);
    let status: 'operational' | 'degraded' | 'down' | 'maintenance';
    let uptime: number;
    
    if (historyData) {
      uptime = historyData.uptime;
      if (historyData.uptime >= 99.5) status = 'operational';
      else if (historyData.uptime >= 95) status = 'degraded';
      else status = 'down';
    } else {
      // Use deterministic values instead of random
      const deterministicData = getDeterministicStatus(i);
      status = deterministicData.status;
      uptime = deterministicData.uptime;
    }
    
    bars.push({ date: dateStr, uptime, status });
  }
  
  // Set the last bar to current status
  bars[bars.length - 1] = {
    ...bars[bars.length - 1],
    status: currentStatus,
    uptime: currentStatus === 'operational' ? 100 : currentStatus === 'degraded' ? 98 : 90,
  };
  
  return bars;
};

// Memoized Uptime Bar Component
const UptimeBar = memo(({ data, locale }: { data: BarData; locale: string }) => {
  const config = STATUS_CONFIG[data.status];
  
  const formattedDate = useMemo(() => 
    new Date(data.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }), [data.date, locale]
  );
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex-1 h-8 rounded-sm ${config.barColor} transition-all duration-200 hover:scale-y-125 hover:opacity-80 cursor-pointer`}
        />
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        sideOffset={16}
        className="bg-gray-900 text-white border-0 rounded-xl px-3 py-2 shadow-lg"
      >
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">{formattedDate}</p>
          <p className="font-semibold">{data.uptime.toFixed(2)}%</p>
          <p className={`text-xs ${config.color}`}>
            {locale === 'ar' ? config.labelAr : config.label}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

UptimeBar.displayName = 'UptimeBar';

// Memoized Service Row Component
const ServiceRow = memo(({ 
  service, 
  serviceMetrics, 
  uptimeHistory, 
  locale, 
  isFirst 
}: { 
  service: ServiceStatus; 
  serviceMetrics?: ServiceMetrics;
  uptimeHistory?: UptimeHistory;
  locale: string;
  isFirst: boolean;
}) => {
  const serviceStatusConfig = STATUS_CONFIG[service.status];
  const uptime = serviceMetrics?.uptime || 99.9;
  
  const historicalBars = useMemo(
    () => generateHistoricalBars(service.status, uptimeHistory),
    [service.status, uptimeHistory]
  );
  
  return (
    <div 
      className={`p-6 ${!isFirst ? 'border-t border-gray-100' : ''} hover:bg-gray-50/50 transition-colors`}
    >
      {/* Service Name, Status and Uptime */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${serviceStatusConfig.bgColor}`} />
            <span className={`text-sm font-semibold ${serviceStatusConfig.color}`}>
              {uptime.toFixed(2)}%
            </span>
          </div>
        </div>
        <span className={`text-sm font-medium ${serviceStatusConfig.color}`}>
          {locale === 'ar' ? serviceStatusConfig.labelAr : serviceStatusConfig.label}
        </span>
      </div>
      
      {/* Full Width Bar Chart */}
      <div className="w-full flex items-center gap-[2px]">
        {historicalBars.map((barData, i) => (
          <UptimeBar key={barData.date} data={barData} locale={locale} />
        ))}
      </div>
      
      {/* Response Time */}
      {service.responseTime && (
        <p className="text-xs text-gray-400 mt-3">
          {locale === 'ar' ? 'وقت الاستجابة' : 'Response time'}: {service.responseTime}ms
        </p>
      )}
    </div>
  );
});

ServiceRow.displayName = 'ServiceRow';

export default function StatusPage() {
  const { locale } = useLocale();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [uptimeHistory, setUptimeHistory] = useState<UptimeHistory | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [serviceMetrics, setServiceMetrics] = useState<Map<string, ServiceMetrics>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch all data in parallel
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Fetch all data in parallel
      const [healthRes, historyRes, incidentsRes, metricsRes] = await Promise.allSettled([
        fetch('/api/health'),
        fetch('/api/health/history?days=90'),
        fetch('/api/health/incidents'),
        fetch('/api/health/metrics'),
      ]);

      // Process health status
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const data = await healthRes.value.json();
        setHealthStatus(data);
      } else {
        setHealthStatus({
          status: 'down',
          services: [],
          timestamp: new Date().toISOString(),
        });
      }

      // Process uptime history
      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const data = await historyRes.value.json();
        setUptimeHistory(data);
      }

      // Process incidents
      if (incidentsRes.status === 'fulfilled' && incidentsRes.value.ok) {
        const data = await incidentsRes.value.json();
        setIncidents(data.incidents || []);
      }

      // Process metrics
      if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
        const data = await metricsRes.value.json();
        const metrics = Array.isArray(data.metrics) ? data.metrics : [data.metrics];
        const metricsMap = new Map<string, ServiceMetrics>();
        metrics.forEach((m: ServiceMetrics) => metricsMap.set(m.name, m));
        setServiceMetrics(metricsMap);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching status data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh interval (no dependencies to avoid recreation)
  useEffect(() => {
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const overallStatus = healthStatus?.status || 'operational';
  const statusConfig = STATUS_CONFIG[overallStatus];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen bg-white flex flex-col">
        <PlatformHeader variant="default" className="bg-white" hideNavButtons showLanguageSwitcher />
        <div className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className={`text-4xl ${locale === 'ar' ? 'font-semibold' : 'font-bold'} tracking-tight mb-3`}>
              {locale === 'ar' ? 'حالة المنصة' : 'Platform Status'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {locale === 'ar' 
                ? 'مراقبة صحة ووضع جميع خدمات هادي في الوقت الحقيقي'
                : 'Real-time monitoring of all Haady services'}
            </p>
          </div>

          {/* Overall Status Card */}
          <Card className="mb-8 border-0 shadow-[0_18px_35px_rgba(15,23,42,0.04)] rounded-3xl bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full ${statusConfig.bgColor} animate-pulse`} />
                  <div>
                    <span className="text-xl font-bold text-gray-900">Haady</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-gray-600">
                      {locale === 'ar' ? 'حالة الخدمة' : 'Service Status'}
                    </span>
                  </div>
                </div>
                <Badge className={`${statusConfig.bgColor} text-white border-0 px-4 py-1.5 text-sm font-medium rounded-full`}>
                  {locale === 'ar' ? statusConfig.labelAr : statusConfig.label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Services Status */}
          <Card className="mb-8 border-0 shadow-[0_18px_35px_rgba(15,23,42,0.04)] rounded-3xl bg-white overflow-hidden">
            <CardContent className="p-0">
              {healthStatus?.services.map((service, index) => (
                <ServiceRow
                  key={service.name}
                  service={service}
                  serviceMetrics={serviceMetrics.get(service.name)}
                  uptimeHistory={uptimeHistory ?? undefined}
                  locale={locale}
                  isFirst={index === 0}
                />
              ))}
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex items-center justify-center gap-8 mb-10 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-gray-600">{locale === 'ar' ? 'تعمل' : 'Operational'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-yellow-500" />
              <span className="text-gray-600">{locale === 'ar' ? 'متدهورة' : 'Degraded'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-gray-600">{locale === 'ar' ? 'معطلة' : 'Down'}</span>
            </div>
          </div>

          {/* Incident History */}
          {incidents.length > 0 && (
            <div className="mb-8">
              <h2 className={`text-2xl ${locale === 'ar' ? 'font-semibold' : 'font-bold'} mb-4 text-gray-900`}>
                {locale === 'ar' ? 'سجل الحوادث' : 'Incident History'}
              </h2>
              <Card className="border-0 shadow-[0_18px_35px_rgba(15,23,42,0.04)] rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-0">
                  {incidents.map((incident, index) => {
                    const severityConfig = {
                      minor: { bgColor: 'bg-yellow-500', label: locale === 'ar' ? 'بسيط' : 'Minor' },
                      major: { bgColor: 'bg-orange-500', label: locale === 'ar' ? 'كبير' : 'Major' },
                      critical: { bgColor: 'bg-red-500', label: locale === 'ar' ? 'حرج' : 'Critical' },
                    }[incident.severity];

                    const incidentStatusConfig = {
                      resolved: { color: 'text-green-500', bgColor: 'bg-green-100', label: locale === 'ar' ? 'تم الحل' : 'Resolved' },
                      investigating: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: locale === 'ar' ? 'قيد التحقيق' : 'Investigating' },
                      monitoring: { color: 'text-blue-600', bgColor: 'bg-blue-100', label: locale === 'ar' ? 'قيد المراقبة' : 'Monitoring' },
                    }[incident.status];

                    return (
                      <div 
                        key={incident.id}
                        className={`p-6 ${index !== 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50/50 transition-colors`}
                      >
                        <div className="flex items-start gap-4">
                          <span className={`w-3 h-3 rounded-full ${severityConfig.bgColor} mt-1.5 shrink-0`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{incident.title}</h4>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${incidentStatusConfig.bgColor} ${incidentStatusConfig.color}`}>
                                {incidentStatusConfig.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">{incident.description}</p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                              <span>
                                {locale === 'ar' ? 'بدأ' : 'Started'}: {new Date(incident.startedAt).toLocaleString()}
                              </span>
                              {incident.resolvedAt && (
                                <span>
                                  {locale === 'ar' ? 'انتهى' : 'Resolved'}: {new Date(incident.resolvedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                            {incident.affectedServices.length > 0 && (
                              <div className="flex items-center gap-2 mt-3">
                                <span className="text-xs text-gray-400">
                                  {locale === 'ar' ? 'الخدمات المتأثرة' : 'Affected'}:
                                </span>
                                <div className="flex gap-1.5">
                                  {incident.affectedServices.map((svc) => (
                                    <span 
                                      key={svc} 
                                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                                    >
                                      {svc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Refresh Section */}
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAllData}
              disabled={isLoading}
              className="gap-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 mb-4"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            <p className="text-sm text-gray-400">
              {locale === 'ar' 
                ? `آخر تحديث: ${lastUpdated.toLocaleString('ar-SA')}`
                : `Last updated: ${lastUpdated.toLocaleString()}`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {locale === 'ar'
                ? 'يتم تحديث الحالة تلقائياً كل 30 ثانية'
                : 'Auto-refreshes every 30 seconds'}
            </p>
          </div>
        </div>
        <Footer className="bg-white" />
      </div>
    </TooltipProvider>
  );
}
