import { supabase } from './supabase'

export interface MonthlyStats {
  month: string
  year: number
  totalLeads: number
  totalMessages: number
  conversions: number
  appointments: number
  avgResponseTime: number
  topCities: Array<{ city: string; count: number }>
  leadSources: Array<{ source: string; count: number }>
}

export interface DailyStats {
  date: string
  leads: number
  messages: number
  conversations: number
}

export interface HourlyStats {
  hour: number
  messages: number
  activeUsers: number
}

export class AnalyticsService {
  static async getMonthlyAnalytics(options?: { months?: number; dateFrom?: string; dateTo?: string }): Promise<MonthlyStats[]> {
    const { months = 12, dateFrom, dateTo } = options || {}
    const monthlyData: MonthlyStats[] = []

    // Build list of month ranges
    const monthRanges: { startOfMonth: string; endOfMonth: string; monthName: string; year: number }[] = []

    if (dateFrom && dateTo) {
      const start = new Date(dateFrom)
      const end = new Date(dateTo)
      const current = new Date(start.getFullYear(), start.getMonth(), 1)
      while (current <= end) {
        const y = current.getFullYear()
        const m = current.getMonth() + 1
        monthRanges.push({
          startOfMonth: new Date(y, m - 1, 1).toISOString(),
          endOfMonth: new Date(y, m, 0, 23, 59, 59).toISOString(),
          monthName: current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          year: y,
        })
        current.setMonth(current.getMonth() + 1)
      }
    } else {
      for (let i = 0; i < months; i++) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const y = date.getFullYear()
        const m = date.getMonth() + 1
        monthRanges.push({
          startOfMonth: new Date(y, m - 1, 1).toISOString(),
          endOfMonth: new Date(y, m, 0, 23, 59, 59).toISOString(),
          monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          year: y,
        })
      }
      monthRanges.reverse()
    }

    for (const range of monthRanges) {
      const { startOfMonth, endOfMonth, monthName, year } = range
      
      try {
        // Get leads for the month
        const { data: leadsData, count: leadsCount } = await supabase
          .from('users')
          .select('*', { count: 'exact' })
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth)
        
        // Get messages for the month
        const { count: messagesCount } = await supabase
          .from('n8n_chat_histories')
          .select('*', { count: 'exact', head: true })
          .gte('timestamp', startOfMonth)
          .lte('timestamp', endOfMonth)
        
        // Get conversions (leads with converted status)
        const conversions = leadsData?.filter(lead => lead.lead_status === 'converted').length || 0
        
        // Get appointments
        const appointments = leadsData?.filter(lead => lead.appointment_date).length || 0
        
        // Get top cities for this month
        const cityCounts: Record<string, number> = {}
        leadsData?.forEach(lead => {
          const city = lead.user_city || 'Unknown'
          cityCounts[city] = (cityCounts[city] || 0) + 1
        })
        const topCities = Object.entries(cityCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([city, count]) => ({ city, count }))
        
        // Get lead sources for this month
        const sourceCounts: Record<string, number> = {}
        leadsData?.forEach(lead => {
          const source = lead.source || 'Unknown'
          sourceCounts[source] = (sourceCounts[source] || 0) + 1
        })
        const leadSources = Object.entries(sourceCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([source, count]) => ({ source, count }))
        
        monthlyData.push({
          month: monthName,
          year,
          totalLeads: leadsCount || 0,
          totalMessages: messagesCount || 0,
          conversions,
          appointments,
          avgResponseTime: 1.2, // This would need to be calculated from actual response times
          topCities,
          leadSources,
        })
      } catch (error) {
        console.error(`Error fetching data for ${monthName}:`, error)
        monthlyData.push({
          month: monthName,
          year,
          totalLeads: 0,
          totalMessages: 0,
          conversions: 0,
          appointments: 0,
          avgResponseTime: 0,
          topCities: [],
          leadSources: [],
        })
      }
    }
    
    return monthlyData // Already in chronological order
  }
  
  static async getDailyAnalytics(options?: { days?: number; dateFrom?: string; dateTo?: string }): Promise<DailyStats[]> {
    const { days = 30, dateFrom, dateTo } = options || {}
    const dailyData: DailyStats[] = []

    // Build list of day ranges
    const dayRanges: { dateStr: string; displayDate: string }[] = []

    if (dateFrom && dateTo) {
      const start = new Date(dateFrom)
      const end = new Date(dateTo)
      const current = new Date(start)
      while (current <= end) {
        dayRanges.push({
          dateStr: current.toISOString().split('T')[0],
          displayDate: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })
        current.setDate(current.getDate() + 1)
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dayRanges.push({
          dateStr: date.toISOString().split('T')[0],
          displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })
      }
    }

    for (const { dateStr, displayDate } of dayRanges) {
      const startOfDay = `${dateStr}T00:00:00.000Z`
      const endOfDay = `${dateStr}T23:59:59.999Z`
      
      try {
        // Get leads for the day
        const { count: leadsCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
        
        // Get messages for the day
        const { count: messagesCount } = await supabase
          .from('n8n_chat_histories')
          .select('*', { count: 'exact', head: true })
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay)
        
        // Get unique conversations (unique session_ids)
        const { data: conversationsData } = await supabase
          .from('n8n_chat_histories')
          .select('session_id')
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay)
        
        const uniqueConversations = new Set(conversationsData?.map(c => c.session_id)).size
        
        dailyData.push({
          date: displayDate,
          leads: leadsCount || 0,
          messages: messagesCount || 0,
          conversations: uniqueConversations,
        })
      } catch (error) {
        console.error(`Error fetching data for ${dateStr}:`, error)
        dailyData.push({
          date: displayDate,
          leads: 0,
          messages: 0,
          conversations: 0,
        })
      }
    }
    
    return dailyData
  }
  
  static async getHourlyAnalytics(options?: { dateFrom?: string; dateTo?: string }): Promise<HourlyStats[]> {
    const { dateFrom, dateTo } = options || {}
    const hourlyData: HourlyStats[] = []

    let rangeStart: string
    let rangeEnd: string

    if (dateFrom && dateTo) {
      rangeStart = `${dateFrom}T00:00:00.000Z`
      rangeEnd = `${dateTo}T23:59:59.999Z`
    } else {
      const now = new Date()
      rangeEnd = now.toISOString()
      rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    }

    try {
      const { data: messagesData } = await supabase
        .from('n8n_chat_histories')
        .select('timestamp, session_id')
        .gte('timestamp', rangeStart)
        .lte('timestamp', rangeEnd)
      
      // Group by hour
      const hourlyStats: Record<number, { messages: number; users: Set<string> }> = {}
      
      // Initialize all hours
      for (let hour = 0; hour < 24; hour++) {
        hourlyStats[hour] = { messages: 0, users: new Set() }
      }
      
      messagesData?.forEach(message => {
        const hour = new Date(message.timestamp).getHours()
        hourlyStats[hour].messages++
        hourlyStats[hour].users.add(message.session_id)
      })
      
      // Convert to array
      for (let hour = 0; hour < 24; hour++) {
        hourlyData.push({
          hour,
          messages: hourlyStats[hour].messages,
          activeUsers: hourlyStats[hour].users.size,
        })
      }
    } catch (error) {
      console.error('Error fetching hourly analytics:', error)
      // Return empty data for all hours
      for (let hour = 0; hour < 24; hour++) {
        hourlyData.push({ hour, messages: 0, activeUsers: 0 })
      }
    }
    
    return hourlyData
  }
  
  static async getOverallStats(dateFilter?: { dateFrom?: string; dateTo?: string }) {
    try {
      const buildQuery = (table: string, field: string, headOnly: boolean) => {
        let q = headOnly
          ? supabase.from(table).select('*', { count: 'exact', head: true })
          : supabase.from(table).select('session_id')
        if (dateFilter?.dateFrom) q = q.gte(field, `${dateFilter.dateFrom}T00:00:00.000Z`)
        if (dateFilter?.dateTo) q = q.lte(field, `${dateFilter.dateTo}T23:59:59.999Z`)
        return q
      }

      const [usersResult, messagesResult, conversationsResult] = await Promise.all([
        buildQuery('users', 'created_at', true),
        buildQuery('n8n_chat_histories', 'timestamp', true),
        buildQuery('n8n_chat_histories', 'timestamp', false)
      ])
      
      const uniqueConversations = new Set(conversationsResult.data?.map(c => c.session_id)).size
      
      return {
        totalLeads: usersResult.count || 0,
        totalMessages: messagesResult.count || 0,
        totalConversations: uniqueConversations,
        avgMessagesPerConversation: uniqueConversations > 0 ? Math.round((messagesResult.count || 0) / uniqueConversations) : 0,
      }
    } catch (error) {
      console.error('Error fetching overall stats:', error)
      return {
        totalLeads: 0,
        totalMessages: 0,
        totalConversations: 0,
        avgMessagesPerConversation: 0,
      }
    }
  }
}
