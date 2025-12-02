import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Types for our database tables - Updated for actual schema
export interface User {
  id: number
  phone_number: string
  full_name?: string
  age?: number
  spouse_name?: string
  spouse_age?: number
  trying_duration?: string
  previous_treatments?: string
  user_city?: string
  preferred_center?: string
  lead_status: 'incomplete' | 'qualified' | 'converted' | 'lost'
  created_at: string
  updated_at: string
  appointment_date?: string
  appointment_time?: string
  source?: string
}

export interface ChatMessage {
  type: 'human' | 'ai'
  content: string
  additional_kwargs?: Record<string, any>
  response_metadata?: Record<string, any>
}

export interface ChatHistory {
  id: number
  session_id: string
  message: ChatMessage
  timestamp: string
}

// Display interfaces for transformed data
export interface DisplayUser {
  id: string
  name: string
  phone: string
  location: string
  age?: number
  leadStatus: string
  appointmentDate?: string
  appointmentTime?: string
  source?: string
  spouseInfo?: string
  tryingDuration?: string
  previousTreatments?: string
  preferredCenter?: string
  created_at: string
  updated_at: string
}

export interface DisplayChat {
  id: string
  session_id: string
  user_phone: string
  message_content: string
  message_type: 'human' | 'ai'
  timestamp: string
}

// Database helper functions - Updated for actual schema
export const getUsersCount = async () => {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
  
  if (error) throw error
  return count || 0
}

export const getChatHistoryCount = async () => {
  const { count, error } = await supabase
    .from('n8n_chat_histories')
    .select('*', { count: 'exact', head: true })
  
  if (error) throw error
  return count || 0
}

export const getActiveUsersToday = async () => {
  const today = new Date().toISOString().split('T')[0]
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', today)
  
  if (error) throw error
  return count || 0
}

export const getRecentUsers = async (limit = 10) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data as User[]
}

export const getRecentChats = async (limit = 20) => {
  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data as ChatHistory[]
}

export const getUserAnalytics = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('created_at, age, user_city, lead_status, source')
  
  if (error) throw error
  return data
}

export const getChatAnalytics = async () => {
  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('timestamp, session_id, message')
  
  if (error) throw error
  return data
}

// New IVF-specific analytics functions
export const getLeadStatusDistribution = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('lead_status')
  
  if (error) throw error
  return data
}

export const getAppointmentStats = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('appointment_date, appointment_time, lead_status')
    .not('appointment_date', 'is', null)
  
  if (error) throw error
  return data
}

export const getCityDistribution = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('user_city')
    .not('user_city', 'is', null)
  
  if (error) throw error
  return data
}

export const getSourceAnalytics = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('source, lead_status')
    .not('source', 'is', null)
  
  if (error) throw error
  return data
}

export const getUserEngagement = async () => {
  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('session_id, timestamp')
  
  if (error) throw error
  return data
}

// ============================================
// SCALABLE SERVER-SIDE QUERIES FOR LAKHS OF DATA
// ============================================

// Cache for expensive queries (in-memory, resets on page refresh)
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = queryCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }
  return null
}

function setCache(key: string, data: any) {
  queryCache.set(key, { data, timestamp: Date.now() })
}

export function clearCache() {
  queryCache.clear()
}

// Get global stats (cached)
export interface GlobalStats {
  totalConversations: number
  totalMessages: number
  totalUsers: number
  activeConversations: number // 5+ messages
  avgMessagesPerConversation: number
}

export const getGlobalStats = async (): Promise<GlobalStats> => {
  const cacheKey = 'global_stats'
  const cached = getCached<GlobalStats>(cacheKey)
  if (cached) return cached

  // Get counts in parallel
  const [usersCount, messagesCount, conversationsData] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('n8n_chat_histories').select('*', { count: 'exact', head: true }),
    // Get conversation stats by counting messages per session
    getConversationStats()
  ])

  const stats: GlobalStats = {
    totalUsers: usersCount.count || 0,
    totalMessages: messagesCount.count || 0,
    totalConversations: conversationsData.totalConversations,
    activeConversations: conversationsData.activeConversations,
    avgMessagesPerConversation: conversationsData.avgMessages
  }

  setCache(cacheKey, stats)
  return stats
}

// Get conversation stats (requires aggregation)
async function getConversationStats() {
  // We need to count unique session_ids and messages per session
  // Since Supabase doesn't support GROUP BY directly, we'll use a different approach
  
  const cacheKey = 'conversation_stats'
  const cached = getCached<{ totalConversations: number; activeConversations: number; avgMessages: number }>(cacheKey)
  if (cached) return cached

  // Get all session_ids with their message counts
  // We'll paginate to handle large datasets
  const sessionCounts = new Map<string, number>()
  let page = 0
  const pageSize = 1000
  
  while (true) {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('session_id')
      .range(page * pageSize, (page + 1) * pageSize - 1)
    
    if (error) throw error
    if (!data || data.length === 0) break
    
    data.forEach(row => {
      sessionCounts.set(row.session_id, (sessionCounts.get(row.session_id) || 0) + 1)
    })
    
    page++
    if (page > 100) break // Safety limit
  }

  const totalConversations = sessionCounts.size
  let activeConversations = 0
  let totalMessages = 0
  
  sessionCounts.forEach(count => {
    totalMessages += count
    if (count >= 5) activeConversations++
  })

  const result = {
    totalConversations,
    activeConversations,
    avgMessages: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
  }

  setCache(cacheKey, result)
  return result
}

// Paginated conversation list (server-side)
export interface ConversationSummary {
  session_id: string
  phone: string
  name: string | null
  city: string | null
  age: number | null
  lead_status: string | null
  message_count: number
  user_messages: number
  ai_messages: number
  last_message: string
  last_activity: string
  first_activity: string
}

export interface ConversationListResponse {
  conversations: ConversationSummary[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export const getConversationList = async (
  page: number = 0,
  pageSize: number = 50,
  search?: string,
  filters?: {
    leadStatus?: string
    city?: string
    minMessages?: number
    dateFrom?: string
    dateTo?: string
  }
): Promise<ConversationListResponse> => {
  // Build the query for users (which represent conversations)
  let query = supabase
    .from('users')
    .select('phone_number, full_name, user_city, age, lead_status, created_at, updated_at', { count: 'exact' })

  // Apply filters
  if (filters?.leadStatus && filters.leadStatus !== 'all') {
    query = query.eq('lead_status', filters.leadStatus)
  }
  
  if (filters?.city && filters.city !== 'all') {
    query = query.eq('user_city', filters.city)
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  // Apply search (server-side)
  if (search && search.trim()) {
    const searchTerm = search.trim()
    // Search in phone_number, full_name, or user_city
    query = query.or(`phone_number.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,user_city.ilike.%${searchTerm}%`)
  }

  // Order and paginate
  query = query
    .order('updated_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  const { data: users, count, error } = await query

  if (error) throw error

  // Now get message stats for these users
  const phoneNumbers = users?.map(u => u.phone_number) || []
  
  // Get message counts for these sessions
  const messageCounts = await getMessageCountsForSessions(phoneNumbers)

  // Build conversation summaries
  const conversations: ConversationSummary[] = (users || []).map(user => {
    const stats = messageCounts.get(user.phone_number) || {
      total: 0,
      user: 0,
      ai: 0,
      lastMessage: '',
      lastActivity: user.updated_at,
      firstActivity: user.created_at
    }

    return {
      session_id: user.phone_number,
      phone: user.phone_number,
      name: user.full_name || null,
      city: user.user_city || null,
      age: user.age || null,
      lead_status: user.lead_status || null,
      message_count: stats.total,
      user_messages: stats.user,
      ai_messages: stats.ai,
      last_message: stats.lastMessage,
      last_activity: stats.lastActivity,
      first_activity: stats.firstActivity
    }
  })

  // Filter by min messages if specified
  let filteredConversations = conversations
  if (filters?.minMessages && filters.minMessages > 0) {
    filteredConversations = conversations.filter(c => c.message_count >= filters.minMessages!)
  }

  return {
    conversations: filteredConversations,
    total: count || 0,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < (count || 0)
  }
}

// Get message counts for specific sessions
async function getMessageCountsForSessions(sessionIds: string[]) {
  const result = new Map<string, {
    total: number
    user: number
    ai: number
    lastMessage: string
    lastActivity: string
    firstActivity: string
  }>()

  if (sessionIds.length === 0) return result

  // Fetch messages for these sessions
  const { data: messages, error } = await supabase
    .from('n8n_chat_histories')
    .select('session_id, message, timestamp')
    .in('session_id', sessionIds)
    .order('timestamp', { ascending: false })

  if (error) throw error

  // Group by session
  const sessionMessages = new Map<string, any[]>()
  messages?.forEach(msg => {
    if (!sessionMessages.has(msg.session_id)) {
      sessionMessages.set(msg.session_id, [])
    }
    sessionMessages.get(msg.session_id)!.push(msg)
  })

  // Calculate stats for each session
  sessionMessages.forEach((msgs, sessionId) => {
    const userMsgs = msgs.filter(m => m.message?.type === 'human').length
    const aiMsgs = msgs.filter(m => m.message?.type === 'ai').length
    const lastMsg = msgs[0]
    const firstMsg = msgs[msgs.length - 1]

    let lastMessageContent = ''
    if (lastMsg?.message?.content) {
      lastMessageContent = extractReadableContent(lastMsg.message)
    }

    result.set(sessionId, {
      total: msgs.length,
      user: userMsgs,
      ai: aiMsgs,
      lastMessage: lastMessageContent,
      lastActivity: lastMsg?.timestamp || '',
      firstActivity: firstMsg?.timestamp || ''
    })
  })

  return result
}

// Extract readable content from message
function extractReadableContent(message: any): string {
  if (!message) return ''
  
  if (typeof message.content === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(message.content)
      if (parsed.output) return parsed.output.substring(0, 200)
      if (parsed.response) return parsed.response.substring(0, 200)
    } catch {
      return message.content.substring(0, 200)
    }
  }
  
  return ''
}

// Server-side search in messages
export const searchConversations = async (
  searchTerm: string,
  page: number = 0,
  pageSize: number = 50
): Promise<ConversationListResponse> => {
  if (!searchTerm.trim()) {
    return getConversationList(page, pageSize)
  }

  // Search in users first (name, phone, city)
  const { data: matchingUsers, error: userError } = await supabase
    .from('users')
    .select('phone_number')
    .or(`phone_number.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,user_city.ilike.%${searchTerm}%`)
    .limit(1000)

  if (userError) throw userError

  const matchingPhones = new Set(matchingUsers?.map(u => u.phone_number) || [])

  // Also search in message content (limited for performance)
  // Note: For lakhs of data, you'd want a proper full-text search index
  const { data: matchingMessages, error: msgError } = await supabase
    .from('n8n_chat_histories')
    .select('session_id')
    .textSearch('message', searchTerm, { type: 'plain' })
    .limit(500)

  if (!msgError && matchingMessages) {
    matchingMessages.forEach(m => matchingPhones.add(m.session_id))
  }

  // Get full user data for matching phones
  const phoneArray = Array.from(matchingPhones)
  
  if (phoneArray.length === 0) {
    return {
      conversations: [],
      total: 0,
      page,
      pageSize,
      hasMore: false
    }
  }

  // Paginate results
  const startIdx = page * pageSize
  const endIdx = startIdx + pageSize
  const paginatedPhones = phoneArray.slice(startIdx, endIdx)

  const { data: users, error: finalError } = await supabase
    .from('users')
    .select('phone_number, full_name, user_city, age, lead_status, created_at, updated_at')
    .in('phone_number', paginatedPhones)
    .order('updated_at', { ascending: false })

  if (finalError) throw finalError

  // Get message stats
  const messageCounts = await getMessageCountsForSessions(paginatedPhones)

  const conversations: ConversationSummary[] = (users || []).map(user => {
    const stats = messageCounts.get(user.phone_number) || {
      total: 0,
      user: 0,
      ai: 0,
      lastMessage: '',
      lastActivity: user.updated_at,
      firstActivity: user.created_at
    }

    return {
      session_id: user.phone_number,
      phone: user.phone_number,
      name: user.full_name || null,
      city: user.user_city || null,
      age: user.age || null,
      lead_status: user.lead_status || null,
      message_count: stats.total,
      user_messages: stats.user,
      ai_messages: stats.ai,
      last_message: stats.lastMessage,
      last_activity: stats.lastActivity,
      first_activity: stats.firstActivity
    }
  })

  return {
    conversations,
    total: phoneArray.length,
    page,
    pageSize,
    hasMore: endIdx < phoneArray.length
  }
}

// Get full conversation messages (for modal)
export const getConversationMessages = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('id, session_id, message, timestamp')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true })

  if (error) throw error
  return data || []
}

// Get user details for a conversation
export const getConversationUser = async (phoneNumber: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data as User | null
}

// ============================================
// ANALYTICS QUERIES (SERVER-SIDE, CACHED)
// ============================================

export interface CityAnalytics {
  city: string
  count: number
  percentage: number
}

export const getCityAnalytics = async (): Promise<CityAnalytics[]> => {
  const cacheKey = 'city_analytics'
  const cached = getCached<CityAnalytics[]>(cacheKey)
  if (cached) return cached

  // Get all cities with pagination
  const cityCounts = new Map<string, number>()
  let page = 0
  const pageSize = 1000
  let total = 0

  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('user_city')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    data.forEach(row => {
      const city = row.user_city || 'Unknown'
      cityCounts.set(city, (cityCounts.get(city) || 0) + 1)
      total++
    })

    page++
    if (page > 10) break
  }

  const result: CityAnalytics[] = Array.from(cityCounts.entries())
    .map(([city, count]) => ({
      city,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20) // Top 20 cities

  setCache(cacheKey, result)
  return result
}

export interface LeadStatusAnalytics {
  status: string
  count: number
  percentage: number
}

export const getLeadStatusAnalytics = async (): Promise<LeadStatusAnalytics[]> => {
  const cacheKey = 'lead_status_analytics'
  const cached = getCached<LeadStatusAnalytics[]>(cacheKey)
  if (cached) return cached

  const statusCounts = new Map<string, number>()
  let page = 0
  const pageSize = 1000
  let total = 0

  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('lead_status')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    data.forEach(row => {
      const status = row.lead_status || 'unknown'
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
      total++
    })

    page++
    if (page > 10) break
  }

  const result: LeadStatusAnalytics[] = Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  setCache(cacheKey, result)
  return result
}

export interface MonthlyAnalytics {
  month: string
  users: number
  messages: number
  conversations: number
}

export const getMonthlyAnalytics = async (): Promise<MonthlyAnalytics[]> => {
  const cacheKey = 'monthly_analytics'
  const cached = getCached<MonthlyAnalytics[]>(cacheKey)
  if (cached) return cached

  const monthlyData = new Map<string, { users: number; messages: number; sessions: Set<string> }>()

  // Get user creation dates
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('created_at')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    data.forEach(row => {
      const month = row.created_at?.substring(0, 7) || 'Unknown'
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { users: 0, messages: 0, sessions: new Set() })
      }
      monthlyData.get(month)!.users++
    })

    page++
    if (page > 10) break
  }

  // Get message dates
  page = 0
  while (true) {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('timestamp, session_id')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    data.forEach(row => {
      const month = row.timestamp?.substring(0, 7) || 'Unknown'
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { users: 0, messages: 0, sessions: new Set() })
      }
      monthlyData.get(month)!.messages++
      monthlyData.get(month)!.sessions.add(row.session_id)
    })

    page++
    if (page > 50) break
  }

  const result: MonthlyAnalytics[] = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      users: data.users,
      messages: data.messages,
      conversations: data.sessions.size
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  setCache(cacheKey, result)
  return result
}

// Get all unique cities for filter dropdown
export const getUniqueCities = async (): Promise<string[]> => {
  const cacheKey = 'unique_cities'
  const cached = getCached<string[]>(cacheKey)
  if (cached) return cached

  const cities = new Set<string>()
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('user_city')
      .not('user_city', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    data.forEach(row => {
      if (row.user_city) cities.add(row.user_city)
    })

    page++
    if (page > 10) break
  }

  const result = Array.from(cities).sort()
  setCache(cacheKey, result)
  return result
}
