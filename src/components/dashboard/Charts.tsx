'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  getLeadStatusAnalytics,
  getCityAnalytics,
  getMonthlyAnalytics,
  type LeadStatusAnalytics,
  type CityAnalytics,
  type MonthlyAnalytics
} from '@/lib/supabase'

// Colors for charts
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
  cyan: '#06B6D4'
}

const STATUS_COLORS: Record<string, string> = {
  converted: COLORS.success,
  qualified: COLORS.primary,
  complete: COLORS.purple,
  incomplete: COLORS.warning,
  lost: COLORS.danger,
  unknown: '#9CA3AF'
}

export function UserActivityChart() {
  const [data, setData] = useState<MonthlyAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalMessages, setTotalMessages] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        const monthlyData = await getMonthlyAnalytics()
        setData(monthlyData)
        
        // Calculate totals
        const users = monthlyData.reduce((sum, m) => sum + m.users, 0)
        const messages = monthlyData.reduce((sum, m) => sum + m.messages, 0)
        setTotalUsers(users)
        setTotalMessages(messages)
      } catch (error) {
        console.error('Error loading activity data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format month labels
  const chartData = data.map(d => ({
    ...d,
    monthLabel: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Monthly Activity Trend</CardTitle>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">
              Total: <span className="font-semibold text-blue-600">{totalUsers.toLocaleString()} users</span>
            </span>
            <span className="text-gray-500">
              <span className="font-semibold text-emerald-600">{totalMessages.toLocaleString()} messages</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="users"
              stroke={COLORS.primary}
              fill="url(#colorUsers)"
              strokeWidth={2}
              name="New Users"
            />
            <Area
              type="monotone"
              dataKey="messages"
              stroke={COLORS.success}
              fill="url(#colorMessages)"
              strokeWidth={2}
              name="Messages"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function HourlyActivityChart() {
  const [data, setData] = useState<MonthlyAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const monthlyData = await getMonthlyAnalytics()
        setData(monthlyData)
      } catch (error) {
        console.error('Error loading monthly data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({
    ...d,
    monthLabel: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short' })
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Conversations</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Bar 
              dataKey="conversations" 
              fill={COLORS.purple} 
              name="Conversations"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function LeadStatusChart() {
  const [data, setData] = useState<LeadStatusAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        const statusData = await getLeadStatusAnalytics()
        setData(statusData)
        setTotal(statusData.reduce((sum, s) => sum + s.count, 0))
      } catch (error) {
        console.error('Error loading lead status data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: d.count,
    percentage: d.percentage,
    color: STATUS_COLORS[d.status] || STATUS_COLORS.unknown
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lead Status Distribution</CardTitle>
          <span className="text-sm text-gray-500">
            Total: <span className="font-semibold">{total.toLocaleString()}</span> leads
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <ResponsiveContainer width="60%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} (${chartData.find(d => d.name === name)?.percentage}%)`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Legend with counts */}
          <div className="flex-1 space-y-3">
            {chartData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-700">{entry.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {entry.value.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({entry.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CityDistributionChart() {
  const [data, setData] = useState<CityAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        const cityData = await getCityAnalytics()
        setData(cityData.slice(0, 10)) // Top 10 cities
        setTotal(cityData.reduce((sum, c) => sum + c.count, 0))
      } catch (error) {
        console.error('Error loading city data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Cities by Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({
    city: d.city.length > 12 ? d.city.substring(0, 12) + '...' : d.city,
    fullCity: d.city,
    count: d.count,
    percentage: d.percentage
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Cities by Leads</CardTitle>
          <span className="text-sm text-gray-500">
            Showing top 10 of <span className="font-semibold">{total.toLocaleString()}</span> leads
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              dataKey="city" 
              type="category" 
              width={100} 
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} leads (${props.payload.percentage}%)`,
                props.payload.fullCity
              ]}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Bar 
              dataKey="count" 
              fill={COLORS.warning}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// New chart for message volume
export function MessageVolumeChart() {
  const [data, setData] = useState<MonthlyAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const monthlyData = await getMonthlyAnalytics()
        setData(monthlyData)
      } catch (error) {
        console.error('Error loading message volume data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Message Volume Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({
    ...d,
    monthLabel: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }))

  const totalMessages = data.reduce((sum, d) => sum + d.messages, 0)
  const avgPerMonth = Math.round(totalMessages / (data.length || 1))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Message Volume Over Time</CardTitle>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">
              Total: <span className="font-semibold text-purple-600">{totalMessages.toLocaleString()}</span>
            </span>
            <span className="text-gray-500">
              Avg/month: <span className="font-semibold">{avgPerMonth.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="messages" 
              stroke={COLORS.purple}
              strokeWidth={3}
              dot={{ fill: COLORS.purple, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: COLORS.purple }}
              name="Messages"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
