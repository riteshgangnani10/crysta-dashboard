'use client'

import { useState } from 'react'
import { UserActivityChart, HourlyActivityChart, LeadStatusChart, CityDistributionChart } from '@/components/dashboard/Charts'
import { DateRangeFilter, type DateRange, type DatePreset } from '@/components/ui/DateRangeFilter'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null })
  const [datePreset, setDatePreset] = useState<DatePreset>('allTime')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IVF Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Comprehensive analytics and insights from your Crysta IVF chatbot data
        </p>
      </div>

      <DateRangeFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        activePreset={datePreset}
        onPresetChange={setDatePreset}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserActivityChart dateFrom={dateRange.from} dateTo={dateRange.to} />
        <HourlyActivityChart dateFrom={dateRange.from} dateTo={dateRange.to} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadStatusChart dateFrom={dateRange.from} dateTo={dateRange.to} />
        <CityDistributionChart dateFrom={dateRange.from} dateTo={dateRange.to} />
      </div>
    </div>
  )
}
