'use client'

import { useEffect, useState, useCallback } from 'react'
import { StatsCard } from './StatsCard'
import { RecentActivity } from './RecentActivity'
import { UserActivityChart, HourlyActivityChart, LeadStatusChart, CityDistributionChart } from './Charts'
import { Button } from '@/components/ui/Button'
import { DateRangeFilter, type DateRange, type DatePreset } from '@/components/ui/DateRangeFilter'
import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  getUsersCount,
  getChatHistoryCount,
  getActiveUsersToday,
  getAppointmentStats,
  getUserAnalytics,
} from '@/lib/supabase'
import { calculateLeadMetrics } from '@/lib/dataTransformers'

interface DashboardStats {
  totalLeads: number
  totalChats: number
  activeUsers: number
  appointmentRate: number
  conversionRate: number
  leadGrowth: number
  chatGrowth: number
  appointmentGrowth: number
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Date filter state
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null })
  const [datePreset, setDatePreset] = useState<DatePreset>('allTime')

  const loadDashboardStats = useCallback(async () => {
    try {
      const dateFilter = { dateFrom: dateRange.from, dateTo: dateRange.to }

      // Fetch real data from Supabase
      const [totalLeads, totalChats, activeUsers, userAnalytics, appointmentData] = await Promise.all([
        getUsersCount(dateFilter),
        getChatHistoryCount(dateFilter),
        getActiveUsersToday(dateFilter),
        getUserAnalytics(dateFilter),
        getAppointmentStats(dateFilter)
      ])

      // Calculate metrics using real data
      const leadMetrics = calculateLeadMetrics(userAnalytics || [])
      const appointmentRate = appointmentData ? (appointmentData.length / totalLeads) * 100 : 0

      const dashboardStats: DashboardStats = {
        totalLeads,
        totalChats,
        activeUsers,
        appointmentRate: Math.round(appointmentRate * 100) / 100,
        conversionRate: leadMetrics.conversionRate,
        leadGrowth: 12, // This would need historical data to calculate properly
        chatGrowth: 18, // This would need historical data to calculate properly
        appointmentGrowth: 8, // This would need historical data to calculate properly
      }

      setStats(dashboardStats)
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadDashboardStats()
  }, [loadDashboardStats])

  const syncDashboard = async () => {
    setSyncing(true)
    await loadDashboardStats()
    setSyncing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            IVF Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time insights from your Crysta IVF chatbot and lead management
          </p>
        </div>
        <Button
          onClick={syncDashboard}
          variant="outline"
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white border-0 hover:bg-blue-700 shadow-sm transition-all duration-200"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        activePreset={datePreset}
        onPresetChange={setDatePreset}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Leads"
          value={stats?.totalLeads || 0}
          change={stats?.leadGrowth}
          changeLabel="vs last month"
          icon={<UsersIcon className="h-4 w-4" />}
          color="blue"
          loading={loading}
        />
        <StatsCard
          title="Total Messages"
          value={stats?.totalChats || 0}
          change={stats?.chatGrowth}
          changeLabel="vs last month"
          icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
          color="green"
          loading={loading}
        />
        <StatsCard
          title="Conversion Rate"
          value={stats ? `${stats.conversionRate}%` : '0%'}
          change={stats?.appointmentGrowth}
          changeLabel="vs last month"
          icon={<ChartBarIcon className="h-4 w-4" />}
          color="purple"
          loading={loading}
        />
        <StatsCard
          title="Appointment Rate"
          value={stats ? `${stats.appointmentRate}%` : '0%'}
          changeLabel="of total leads"
          icon={<CalendarIcon className="h-4 w-4" />}
          color="yellow"
          loading={loading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserActivityChart dateFrom={dateRange.from} dateTo={dateRange.to} />
        <HourlyActivityChart dateFrom={dateRange.from} dateTo={dateRange.to} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadStatusChart dateFrom={dateRange.from} dateTo={dateRange.to} />
        <CityDistributionChart dateFrom={dateRange.from} dateTo={dateRange.to} />
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  )
}
