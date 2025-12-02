import { User, ChatHistory, DisplayUser, DisplayChat, ChatMessage } from './supabase'

// Transform user data from database format to display format
export function transformUser(user: User): DisplayUser {
  const spouseInfo = user.spouse_name && user.spouse_age 
    ? `${user.spouse_name} (${user.spouse_age} years)`
    : user.spouse_name || ''

  return {
    id: user.id.toString(),
    name: user.full_name || 'Unknown',
    phone: user.phone_number,
    location: user.user_city || 'Not specified',
    age: user.age,
    leadStatus: formatLeadStatus(user.lead_status),
    appointmentDate: user.appointment_date,
    appointmentTime: user.appointment_time,
    source: user.source || 'Unknown',
    spouseInfo,
    tryingDuration: user.trying_duration,
    previousTreatments: user.previous_treatments,
    preferredCenter: user.preferred_center,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

// Transform chat history from database format to display format
export function transformChat(chat: ChatHistory): DisplayChat {
  const messageContent = extractMessageContent(chat.message)
  
  return {
    id: chat.id.toString(),
    session_id: chat.session_id,
    user_phone: chat.session_id, // session_id appears to be phone number
    message_content: messageContent,
    message_type: chat.message.type,
    timestamp: chat.timestamp,
  }
}

// Extract content from the JSON message structure
export function extractMessageContent(message: ChatMessage): string {
  if (typeof message === 'string') {
    return message
  }
  
  if (message && typeof message === 'object' && message.content) {
    // For AI messages, content might be JSON with "output" field
    if (message.type === 'ai') {
      try {
        const parsed = JSON.parse(message.content)
        if (parsed.output) {
          return parsed.output
        }
      } catch {
        // Not JSON, return as-is
      }
    }
    return message.content
  }
  
  return 'No content available'
}

// Extract AI response output (human-readable message)
export function extractAIOutput(content: string): string {
  try {
    const parsed = JSON.parse(content)
    return parsed.output || content
  } catch {
    return content
  }
}

// Extract user data from AI response
export function extractUserDataFromAI(content: string): {
  name?: string
  age?: string
  city?: string
  spouseName?: string
  spouseAge?: string
  tryingDuration?: string
  previousTreatments?: string
  preferredCenter?: string
  leadStatus?: string
} | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed.DATA) {
      return {
        name: parsed.DATA.full_name,
        age: parsed.DATA.age,
        city: parsed.DATA.user_city,
        spouseName: parsed.DATA.spouse_name,
        spouseAge: parsed.DATA.spouse_age,
        tryingDuration: parsed.DATA.trying_duration,
        previousTreatments: parsed.DATA.previous_treatments,
        preferredCenter: parsed.DATA.preferred_center,
        leadStatus: parsed.DATA.lead_status,
      }
    }
  } catch {
    // Not valid JSON
  }
  return null
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

// Format timestamp for chat display
export function formatChatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString()
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  
  if (isToday) {
    return `Today ${timeStr}`
  } else if (isYesterday) {
    return `Yesterday ${timeStr}`
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}

// Generate avatar color based on name
export function getAvatarColor(name: string): string {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-purple-500 to-purple-600',
    'from-rose-500 to-rose-600',
    'from-amber-500 to-amber-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-pink-500 to-pink-600',
  ]
  
  // Generate consistent color based on name hash
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// Format lead status for display
export function formatLeadStatus(status: string): string {
  const statusMap: Record<string, string> = {
    incomplete: 'Incomplete',
    qualified: 'Qualified',
    converted: 'Converted',
    lost: 'Lost',
  }
  
  return statusMap[status] || status
}

// Get lead status color for UI
export function getLeadStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    incomplete: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-blue-100 text-blue-800',
    converted: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
  }
  
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

// Calculate user engagement metrics
export function calculateUserEngagement(chats: ChatHistory[]): {
  totalMessages: number
  uniqueUsers: number
  avgMessagesPerUser: number
  messagesByHour: Record<number, number>
  messagesByDay: Record<string, number>
} {
  const uniqueUsers = new Set(chats.map(chat => chat.session_id)).size
  const totalMessages = chats.length
  const avgMessagesPerUser = uniqueUsers > 0 ? totalMessages / uniqueUsers : 0

  // Messages by hour (0-23)
  const messagesByHour: Record<number, number> = {}
  for (let i = 0; i < 24; i++) {
    messagesByHour[i] = 0
  }

  // Messages by day (last 7 days)
  const messagesByDay: Record<string, number> = {}
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split('T')[0]
  })

  last7Days.forEach(day => {
    messagesByDay[day] = 0
  })

  chats.forEach(chat => {
    const date = new Date(chat.timestamp)
    const hour = date.getHours()
    const day = date.toISOString().split('T')[0]

    messagesByHour[hour]++
    if (messagesByDay.hasOwnProperty(day)) {
      messagesByDay[day]++
    }
  })

  return {
    totalMessages,
    uniqueUsers,
    avgMessagesPerUser: Math.round(avgMessagesPerUser * 100) / 100,
    messagesByHour,
    messagesByDay,
  }
}

// Calculate lead conversion metrics
export function calculateLeadMetrics(users: Partial<User>[]): {
  totalLeads: number
  conversionRate: number
  appointmentRate: number
  statusDistribution: Record<string, number>
  cityDistribution: Record<string, number>
  sourceDistribution: Record<string, number>
} {
  const totalLeads = users.length
  const converted = users.filter(u => u.lead_status === 'converted').length
  const withAppointments = users.filter(u => u.appointment_date).length
  
  const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0
  const appointmentRate = totalLeads > 0 ? (withAppointments / totalLeads) * 100 : 0

  // Status distribution
  const statusDistribution: Record<string, number> = {}
  users.forEach(user => {
    const status = user.lead_status || 'unknown'
    statusDistribution[status] = (statusDistribution[status] || 0) + 1
  })

  // City distribution
  const cityDistribution: Record<string, number> = {}
  users.forEach(user => {
    const city = user.user_city || 'Unknown'
    cityDistribution[city] = (cityDistribution[city] || 0) + 1
  })

  // Source distribution
  const sourceDistribution: Record<string, number> = {}
  users.forEach(user => {
    const source = user.source || 'Unknown'
    sourceDistribution[source] = (sourceDistribution[source] || 0) + 1
  })

  return {
    totalLeads,
    conversionRate: Math.round(conversionRate * 100) / 100,
    appointmentRate: Math.round(appointmentRate * 100) / 100,
    statusDistribution,
    cityDistribution,
    sourceDistribution,
  }
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  if (!phone) return 'No phone'
  
  // Remove country code if present and format
  const cleaned = phone.replace(/^\+?91/, '').replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  
  return phone
}

// Get initials from name for avatar
export function getInitials(name: string): string {
  if (!name || name === 'Unknown') return 'U'
  
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

// Format date for display
export function formatDate(dateString: string): string {
  if (!dateString) return 'Not set'
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}
