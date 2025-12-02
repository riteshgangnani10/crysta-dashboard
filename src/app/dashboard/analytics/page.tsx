import { UserActivityChart, HourlyActivityChart, LeadStatusChart, CityDistributionChart } from '@/components/dashboard/Charts'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IVF Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Comprehensive analytics and insights from your Crysta IVF chatbot data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserActivityChart />
        <HourlyActivityChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadStatusChart />
        <CityDistributionChart />
      </div>
    </div>
  )
}
