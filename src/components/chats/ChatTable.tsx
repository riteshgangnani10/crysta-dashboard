'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { 
  getGlobalStats,
  getConversationList,
  searchConversations,
  getUniqueCities,
  clearCache,
  type GlobalStats,
  type ConversationSummary,
  type ConversationListResponse
} from '@/lib/supabase'
import { formatPhoneNumber } from '@/lib/dataTransformers'
import { ConversationCard, ConversationCardSkeleton, type ConversationSummary as CardConversationSummary } from './ConversationCard'
import { ConversationModal } from './ConversationModal'
import { Button } from '@/components/ui/Button'

const PAGE_SIZE = 50

export function ChatTable() {
  // Data state
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [cities, setCities] = useState<string[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searching, setSearching] = useState(false)
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCity, setFilterCity] = useState<string>('all')
  const [filterMessages, setFilterMessages] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'messages' | 'name'>('recent')
  const [showFilters, setShowFilters] = useState(false)
  
  // Modal state
  const [selectedConversation, setSelectedConversation] = useState<CardConversationSummary | null>(null)
  
  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(0) // Reset to first page on search
    }, 300)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load conversations when filters change
  useEffect(() => {
    loadConversations()
  }, [currentPage, debouncedSearch, filterStatus, filterCity, filterMessages])

  const loadInitialData = async () => {
    try {
      // Load stats and cities in parallel
      const [statsData, citiesData] = await Promise.all([
        getGlobalStats(),
        getUniqueCities()
      ])
      
      setStats(statsData)
      setCities(citiesData)
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadConversations = async () => {
    setLoading(true)
    setSearching(!!debouncedSearch)
    
    try {
      let response: ConversationListResponse
      
      if (debouncedSearch) {
        // Use server-side search
        response = await searchConversations(debouncedSearch, currentPage, PAGE_SIZE)
      } else {
        // Use filtered list
        response = await getConversationList(currentPage, PAGE_SIZE, undefined, {
          leadStatus: filterStatus !== 'all' ? filterStatus : undefined,
          city: filterCity !== 'all' ? filterCity : undefined,
          minMessages: filterMessages === 'active' ? 5 : undefined
        })
      }
      
      setConversations(response.conversations)
      setTotalCount(response.total)
      setHasMore(response.hasMore)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const syncData = async () => {
    setSyncing(true)
    clearCache() // Clear cache to get fresh data
    
    try {
      await Promise.all([
        loadInitialData(),
        loadConversations()
      ])
    } finally {
      setSyncing(false)
    }
  }

  const exportConversations = async () => {
    // For export, we'll fetch more data
    const allData: ConversationSummary[] = []
    let page = 0
    
    while (true) {
      const response = await getConversationList(page, 1000, debouncedSearch || undefined, {
        leadStatus: filterStatus !== 'all' ? filterStatus : undefined,
        city: filterCity !== 'all' ? filterCity : undefined
      })
      
      allData.push(...response.conversations)
      if (!response.hasMore) break
      page++
      if (page > 10) break // Safety limit
    }

    const csvContent = [
      ['Phone', 'Name', 'City', 'Age', 'Lead Status', 'Messages', 'Last Activity', 'Last Message'],
      ...allData.map(conv => [
        formatPhoneNumber(conv.phone),
        conv.name || 'Unknown',
        conv.city || '',
        conv.age?.toString() || '',
        conv.lead_status || 'incomplete',
        conv.message_count.toString(),
        conv.last_activity,
        `"${conv.last_message.replace(/"/g, '""').slice(0, 100)}"`
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'conversations.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setDebouncedSearch('')
    setFilterStatus('all')
    setFilterCity('all')
    setFilterMessages('all')
    setSortBy('recent')
    setCurrentPage(0)
  }

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || filterCity !== 'all' || filterMessages !== 'all'

  // Convert server response to card format
  const cardConversations: CardConversationSummary[] = conversations.map(conv => ({
    sessionId: conv.session_id,
    phone: conv.phone,
    name: conv.name,
    city: conv.city,
    age: conv.age,
    leadStatus: conv.lead_status,
    messageCount: conv.message_count,
    userMessageCount: conv.user_messages,
    aiMessageCount: conv.ai_messages,
    lastMessage: conv.last_message,
    lastMessageType: 'ai' as const,
    lastActivity: conv.last_activity,
    firstActivity: conv.first_activity
  }))

  // Sort client-side (for current page only)
  const sortedConversations = [...cardConversations].sort((a, b) => {
    if (sortBy === 'messages') {
      return b.messageCount - a.messageCount
    } else if (sortBy === 'name') {
      return (a.name || 'zzz').localeCompare(b.name || 'zzz')
    }
    return 0 // Default is already sorted by recent from server
  })

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const startItem = currentPage * PAGE_SIZE + 1
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, totalCount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
            Conversations
          </h1>
          <p className="mt-1 text-gray-600">
            View and analyze all chat conversations from your IVF chatbot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={syncData}
            variant="outline"
            disabled={syncing}
            className="gap-2"
          >
            <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button
            onClick={exportConversations}
            variant="outline"
            className="gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Bar - Shows GLOBAL stats from entire database */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats?.totalConversations.toLocaleString() || '—'}
              </div>
              <div className="text-xs text-gray-500">Total Conversations</div>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats?.totalMessages.toLocaleString() || '—'}
              </div>
              <div className="text-xs text-gray-500">Total Messages</div>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats?.avgMessagesPerConversation || '—'}
              </div>
              <div className="text-xs text-gray-500">Avg per Conversation</div>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats?.activeConversations.toLocaleString() || '—'}
              </div>
              <div className="text-xs text-gray-500">Active (5+ msgs)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search - Server-side */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or city... (searches entire database)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className={`gap-2 ${showFilters ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </Button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="messages">Most Messages</option>
                <option value="name">Alphabetical</option>
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Lead Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(0)
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="incomplete">Incomplete</option>
                <option value="complete">Complete</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">City:</span>
              <select
                value={filterCity}
                onChange={(e) => {
                  setFilterCity(e.target.value)
                  setCurrentPage(0)
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 max-w-[200px]"
              >
                <option value="all">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Activity:</span>
              <select
                value={filterMessages}
                onChange={(e) => {
                  setFilterMessages(e.target.value)
                  setCurrentPage(0)
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500"
              >
                <option value="all">All Conversations</option>
                <option value="active">Active (5+ messages)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count and Pagination Info */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {totalCount > 0 ? (
            <>Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of {totalCount.toLocaleString()} conversations</>
          ) : (
            'No conversations found'
          )}
        </span>
        {hasActiveFilters && (
          <span className="text-blue-600">Filters applied • Searching entire database</span>
        )}
      </div>

      {/* Conversation List */}
      <div className="space-y-3">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <ConversationCardSkeleton key={i} />
          ))
        ) : sortedConversations.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
            <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No conversations found</h3>
            <p className="text-gray-500">
              {hasActiveFilters 
                ? 'Try adjusting your filters or search term'
                : 'Conversations will appear here when users interact with your chatbot'
              }
            </p>
          </div>
        ) : (
          sortedConversations.map(conversation => (
            <ConversationCard
              key={conversation.sessionId}
              conversation={conversation}
              onClick={() => setSelectedConversation(conversation)}
              isSelected={selectedConversation?.sessionId === conversation.sessionId}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0 || loading}
            variant="outline"
            className="gap-1"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i
              } else if (currentPage < 3) {
                pageNum = i
              } else if (currentPage > totalPages - 4) {
                pageNum = totalPages - 5 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={loading}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            
            {totalPages > 5 && currentPage < totalPages - 3 && (
              <>
                <span className="px-2 text-gray-400">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages - 1)}
                  disabled={loading}
                  className="w-10 h-10 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={!hasMore || loading}
            variant="outline"
            className="gap-1"
          >
            Next
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Conversation Modal */}
      {selectedConversation && (
        <ConversationModal
          conversation={selectedConversation}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </div>
  )
}
