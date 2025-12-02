'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatRelativeTime, getInitials, formatPhoneNumber, extractMessageContent } from '@/lib/dataTransformers'
import { generateRandomColor } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface RecentUser extends User {
  users?: Pick<User, 'name' | 'email'>
}

interface RecentChat extends ChatHistory {
  users: Pick<User, 'name' | 'email'>
}

export function RecentActivity() {
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentChats, setRecentChats] = useState<RecentChat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadRecentActivity = async () => {
    try {
      // For demo purposes, we'll use mock data
      // In production, uncomment these lines:
      // const [users, chats] = await Promise.all([
      //   getRecentUsers(5),
      //   getRecentChats(10)
      // ])
      
      // Mock data for demonstration
      const users: RecentUser[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.j@email.com',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
          age: 32,
          gender: 'female',
          location: 'Mumbai',
          total_messages: 12,
          status: 'active'
        },
        {
          id: '2',
          name: 'Raj Patel',
          email: 'raj.patel@email.com',
          created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
          age: 28,
          gender: 'male',
          location: 'Delhi',
          total_messages: 8,
          status: 'active'
        },
        {
          id: '3',
          name: 'Priya Sharma',
          email: 'priya.s@email.com',
          created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
          age: 35,
          gender: 'female',
          location: 'Bangalore',
          total_messages: 15,
          status: 'inactive'
        }
      ]

      const chats: RecentChat[] = [
        {
          id: '1',
          user_id: '1',
          session_id: 'sess_1',
          message: 'What are the success rates for IVF?',
          response: 'IVF success rates vary based on several factors including age, cause of infertility, and clinic expertise. Generally, for women under 35, success rates are around 40-50% per cycle.',
          message_type: 'user',
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          sentiment: 'neutral',
          intent: 'information_seeking',
          confidence_score: 0.85,
          response_time: 1200,
          users: { name: 'Sarah Johnson', email: 'sarah.j@email.com' }
        },
        {
          id: '2',
          user_id: '2',
          session_id: 'sess_2',
          message: 'How much does IVF cost?',
          response: 'IVF costs can vary significantly depending on location and clinic. In India, a single IVF cycle typically ranges from ₹1,50,000 to ₹3,00,000. This includes medications, procedures, and monitoring.',
          message_type: 'user',
          created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          sentiment: 'concerned',
          intent: 'cost_inquiry',
          confidence_score: 0.92,
          response_time: 800,
          users: { name: 'Raj Patel', email: 'raj.patel@email.com' }
        }
      ]

      setRecentUsers(users)
      setRecentChats(chats)
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
            <CardTitle>Recent Users</CardTitle>
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
            <CardTitle>Recent Chats</CardTitle>
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
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${generateRandomColor()}`}>
                  {getInitials(user.name || 'Unknown')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {user.location} • {user.age} years • {user.total_messages} messages
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {formatRelativeTime(user.created_at)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Chats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentChats.map((chat) => (
              <div key={chat.id} className="border-l-4 border-blue-200 pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {chat.users.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {chat.message}
                    </p>
                    <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full ${
                        chat.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        chat.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {chat.sentiment}
                      </span>
                      <span>{chat.response_time}ms</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 ml-4">
                    {formatRelativeTime(chat.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
