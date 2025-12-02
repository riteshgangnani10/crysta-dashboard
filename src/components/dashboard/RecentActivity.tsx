'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatRelativeTime, getInitials, formatPhoneNumber, extractAIOutput } from '@/lib/dataTransformers'
import { generateRandomColor } from '@/lib/utils'
import { supabase, User, ChatHistory } from '@/lib/supabase'

interface RecentUserDisplay {
  id: number
  name: string
  phone: string
  location: string
  age?: number
  lead_status: string
  created_at: string
}

interface RecentChatDisplay {
  id: number
  session_id: string
  message_content: string
  message_type: 'human' | 'ai'
  timestamp: string
  user_name?: string
}

export function RecentActivity() {
  const [recentUsers, setRecentUsers] = useState<RecentUserDisplay[]>([])
  const [recentChats, setRecentChats] = useState<RecentChatDisplay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadRecentActivity = async () => {
    try {
      // Fetch recent users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, phone_number, full_name, user_city, age, lead_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (usersError) throw usersError

      // Fetch recent chats
      const { data: chats, error: chatsError } = await supabase
        .from('n8n_chat_histories')
        .select('id, session_id, message, timestamp')
        .order('timestamp', { ascending: false })
        .limit(10)

      if (chatsError) throw chatsError

      // Transform users
      const transformedUsers: RecentUserDisplay[] = (users || []).map(user => ({
        id: user.id,
        name: user.full_name || 'Unknown',
        phone: user.phone_number,
        location: user.user_city || 'Not specified',
        age: user.age,
        lead_status: user.lead_status || 'incomplete',
        created_at: user.created_at
      }))

      // Get user names for chats
      const sessionIds = [...new Set(chats?.map(c => c.session_id) || [])]
      const { data: chatUsers } = await supabase
        .from('users')
        .select('phone_number, full_name')
        .in('phone_number', sessionIds)

      const userMap = new Map<string, string>()
      chatUsers?.forEach(u => {
        if (u.full_name) userMap.set(u.phone_number, u.full_name)
      })

      // Transform chats
      const transformedChats: RecentChatDisplay[] = (chats || []).map(chat => {
        let content = ''
        if (chat.message?.type === 'ai') {
          content = extractAIOutput(chat.message.content)
        } else {
          content = chat.message?.content || ''
        }

        return {
          id: chat.id,
          session_id: chat.session_id,
          message_content: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
          message_type: chat.message?.type || 'human',
          timestamp: chat.timestamp,
          user_name: userMap.get(chat.session_id)
        }
      })

      setRecentUsers(transformedUsers)
      setRecentChats(transformedChats)
    } catch (error) {
      console.error('Error loading recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No recent leads</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${generateRandomColor()}`}>
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user.location} {user.age ? `• ${user.age} yrs` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user.lead_status === 'complete' || user.lead_status === 'converted' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {user.lead_status}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {formatRelativeTime(user.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentChats.length === 0 ? (
              <p className="text-sm text-gray-500">No recent messages</p>
            ) : (
              recentChats.slice(0, 5).map((chat) => (
                <div key={chat.id} className={`border-l-4 pl-4 ${
                  chat.message_type === 'ai' ? 'border-blue-200' : 'border-green-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {chat.user_name || formatPhoneNumber(chat.session_id)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {chat.message_content}
                      </p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                        chat.message_type === 'ai' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {chat.message_type === 'ai' ? 'AI Response' : 'User'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                      {formatRelativeTime(chat.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
