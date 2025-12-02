'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchUsers()

    // Set up real-time subscription for users table
    const channel: RealtimeChannel = supabase
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          console.log('Users change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            setUsers(prev => [payload.new as any, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setUsers(prev => prev.map(user => 
              user.id === payload.new.id ? payload.new as any : user
            ))
          } else if (payload.eventType === 'DELETE') {
            setUsers(prev => prev.filter(user => user.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchUsers])

  return { users, loading, error, refetch: fetchUsers }
}

export function useRealtimeChats() {
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_histories')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setChats(data || [])
    } catch (err) {
      console.error('Error fetching chats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchChats()

    // Set up real-time subscription for n8n_chat_histories table
    const channel: RealtimeChannel = supabase
      .channel('chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'n8n_chat_histories',
        },
        (payload) => {
          console.log('Chat change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            // Add the new chat directly since we don't have user joins
            setChats(prev => [payload.new as any, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setChats(prev => prev.map(chat => 
              chat.id === payload.new.id ? { ...chat, ...payload.new } : chat
            ))
          } else if (payload.eventType === 'DELETE') {
            setChats(prev => prev.filter(chat => chat.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchChats])

  return { chats, loading, error, refetch: fetchChats }
}

export function useRealtimeStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChats: 0,
    activeUsers: 0,
    avgResponseTime: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const [usersResult, chatsResult, activeUsersResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('n8n_chat_histories').select('*', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ])

      setStats({
        totalUsers: usersResult.count || 0,
        totalChats: chatsResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        avgResponseTime: 0, // Not applicable for this data structure
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)

    return () => clearInterval(interval)
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}

// Hook for connection status
export function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>('CONNECTING')

  useEffect(() => {
    const channel = supabase.channel('connection_test')
    
    channel
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true)
        setConnectionStatus('CONNECTED')
      })
      .subscribe((status) => {
        setConnectionStatus(status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { isConnected, connectionStatus }
}
