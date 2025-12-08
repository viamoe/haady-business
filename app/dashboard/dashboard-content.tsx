'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  ShoppingBag, 
  Store, 
  TrendingUp, 
  ArrowRight, 
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  BarChart3,
  Users,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardContentProps {
  userName: string
  merchantName: string
  storeCount: number
}

// Get greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Stats card component
function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  gradient,
}: { 
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  trend?: { value: string; positive: boolean }
  gradient: string
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute inset-0 ${gradient} opacity-5`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${gradient}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold">{value}</div>
          {trend && (
            <Badge 
              variant="secondary" 
              className={`text-[10px] font-medium ${
                trend.positive 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
            >
              <ArrowUpRight className={`h-3 w-3 mr-0.5 ${!trend.positive && 'rotate-90'}`} />
              {trend.value}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// Checklist item component
function ChecklistItem({ 
  title, 
  description, 
  completed, 
  href,
}: { 
  title: string
  description: string
  completed: boolean
  href: string
}) {
  return (
    <Link 
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
    </Link>
  )
}

export function DashboardContent({ userName, merchantName, storeCount }: DashboardContentProps) {
  const hasStore = storeCount > 0
  
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {getGreeting()}, {userName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with <span className="font-medium text-foreground">{merchantName}</span> today.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2 shadow-sm h-9">
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Stores"
          value={storeCount}
          description="Active stores"
          icon={Store}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatsCard
          title="Total Products"
          value={0}
          description="Products in catalog"
          icon={Package}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <StatsCard
          title="Total Orders"
          value={0}
          description="All time orders"
          icon={ShoppingBag}
          trend={{ value: '0%', positive: true }}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatsCard
          title="Revenue"
          value="$0"
          description="Total revenue"
          icon={TrendingUp}
          trend={{ value: '0%', positive: true }}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
      </div>

      {/* Quick Actions & Getting Started */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Getting Started */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Getting Started
                </CardTitle>
                <CardDescription className="mt-1">
                  Complete these steps to start selling
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {hasStore ? 1 : 0}/4 completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <ChecklistItem
              title="Create your first store"
              description="Set up your online storefront"
              completed={hasStore}
              href="/dashboard/stores"
            />
            <ChecklistItem
              title="Add your products"
              description="Build your product catalog"
              completed={false}
              href="/dashboard/products"
            />
            <ChecklistItem
              title="Configure payment methods"
              description="Accept payments from customers"
              completed={false}
              href="/dashboard/settings"
            />
            <ChecklistItem
              title="Set up shipping"
              description="Define delivery options"
              completed={false}
              href="/dashboard/settings"
            />
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Quick Stats
            </CardTitle>
            <CardDescription>Your business at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-violet-600" />
                </div>
                <span className="text-sm">Customers</span>
              </div>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm">Products</span>
              </div>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm">Pending Orders</span>
              </div>
              <span className="font-semibold">0</span>
            </div>
            
            <div className="pt-2 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/analytics">
                  View Analytics
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Tips */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest business updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <ShoppingBag className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start by adding your first product!
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/dashboard/products/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips & Resources */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tips & Resources
            </CardTitle>
            <CardDescription>Grow your business with these resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="#" 
              className="flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Optimize your store</p>
                <p className="text-xs text-muted-foreground">Learn best practices for your storefront</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
            </Link>
            <Link 
              href="#" 
              className="flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Marketing guide</p>
                <p className="text-xs text-muted-foreground">Reach more customers effectively</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
            </Link>
            <Link 
              href="#" 
              className="flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Customer support</p>
                <p className="text-xs text-muted-foreground">Get help from our team</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

