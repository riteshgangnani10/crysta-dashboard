'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, supabase, getUniqueCities, clearCache } from '@/lib/supabase'
import { 
  transformUser, 
  formatPhoneNumber, 
  getInitials, 
  formatDate, 
  formatRelativeTime,
  getLeadStatusColor,
  DisplayUser 
} from '@/lib/dataTransformers'
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  PhoneIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

const PAGE_SIZE = 50

export function UserTable() {
  const [users, setUsers] = useState<DisplayUser[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searching, setSearching] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCity, setFilterCity] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter options
  const [cities, setCities] = useState<string[]>([])
  
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
    loadCities()
  }, [])

  // Load users when filters change
  useEffect(() => {
    loadUsers()
  }, [currentPage, debouncedSearch, filterStatus, filterCity])

  const loadCities = async () => {
    try {
      const citiesData = await getUniqueCities()
      setCities(citiesData)
    } catch (error) {
      console.error('Error loading cities:', error)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    setSearching(!!debouncedSearch)
    
    try {
      // Build the query
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })

      // Apply server-side search
      if (debouncedSearch) {
        const searchTerm = debouncedSearch.trim()
        query = query.or(`phone_number.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,user_city.ilike.%${searchTerm}%,spouse_name.ilike.%${searchTerm}%,preferred_center.ilike.%${searchTerm}%`)
      }

      // Apply filters
      if (filterStatus !== 'all') {
        query = query.eq('lead_status', filterStatus)
      }
      
      if (filterCity !== 'all') {
        query = query.eq('user_city', filterCity)
      }

      // Order and paginate
      query = query
        .order('updated_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

      const { data, count, error } = await query

      if (error) throw error

      const transformedUsers = (data || []).map(transformUser)
      setUsers(transformedUsers)
      setTotalUsers(count || 0)
      setHasMore((currentPage + 1) * PAGE_SIZE < (count || 0))
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const syncData = async () => {
    setSyncing(true)
    clearCache()
    await Promise.all([loadCities(), loadUsers()])
    setSyncing(false)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setDebouncedSearch('')
    setFilterStatus('all')
    setFilterCity('all')
    setCurrentPage(0)
  }

  const exportUsers = async () => {
    // For export, fetch more data
    const allUsers: DisplayUser[] = []
    let page = 0
    
    while (true) {
      let query = supabase
        .from('users')
        .select('*')
      
      if (debouncedSearch) {
        query = query.or(`phone_number.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%,user_city.ilike.%${debouncedSearch}%`)
      }
      
      if (filterStatus !== 'all') {
        query = query.eq('lead_status', filterStatus)
      }
      
      if (filterCity !== 'all') {
        query = query.eq('user_city', filterCity)
      }
      
      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .range(page * 1000, (page + 1) * 1000 - 1)
      
      if (error) throw error
      if (!data || data.length === 0) break
      
      allUsers.push(...data.map(transformUser))
      page++
      if (page > 10) break // Safety limit
    }

    const csvContent = [
      ['Name', 'Phone', 'Age', 'Location', 'Lead Status', 'Appointment Date', 'Appointment Time', 'Source', 'Spouse Info', 'Trying Duration', 'Previous Treatments', 'Preferred Center', 'Created', 'Updated'],
      ...allUsers.map(user => [
        user.name || '',
        user.phone || '',
        user.age || '',
        user.location || '',
        user.leadStatus || '',
        user.appointmentDate || '',
        user.appointmentTime || '',
        user.source || '',
        user.spouseInfo || '',
        user.tryingDuration || '',
        user.previousTreatments || '',
        user.preferredCenter || '',
        formatDate(user.created_at),
        formatDate(user.updated_at)
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ivf_leads.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || filterCity !== 'all'

  // Calculate pagination
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE)
  const startItem = currentPage * PAGE_SIZE + 1
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, totalUsers)

  if (loading && users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
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
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IVF Leads</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage and view all IVF leads and their information
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>
              {totalUsers > 0 ? (
                <>All Leads ({startItem.toLocaleString()}–{endItem.toLocaleString()} of {totalUsers.toLocaleString()})</>
              ) : (
                'All Leads'
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                onClick={syncData}
                variant="outline"
                size="sm"
                disabled={syncing}
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportUsers}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          <div className="mt-4 space-y-4">
            {/* Main Search - Server-side */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads by name, phone, location, spouse... (searches entire database)"
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
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(0)
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Lead Status</option>
                <option value="incomplete">Incomplete</option>
                <option value="complete">Complete</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Advanced Filters</h4>
                  {hasActiveFilters && (
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      size="sm"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <select
                      value={filterCity}
                      onChange={(e) => {
                        setFilterCity(e.target.value)
                        setCurrentPage(0)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Cities</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Search indicator */}
            {hasActiveFilters && (
              <div className="text-sm text-blue-600">
                Filters applied • Searching entire database
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IVF Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  // Loading state
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4">
                        <div className="animate-pulse flex items-center space-x-4">
                          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <p className="text-lg font-medium">No leads found</p>
                        <p className="text-sm mt-1">
                          {hasActiveFilters 
                            ? 'Try adjusting your filters or search term'
                            : 'Leads will appear here when users interact with your chatbot'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {getInitials(user.name)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Age: {user.age || 'Not specified'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Source: {user.source}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          {formatPhoneNumber(user.phone)}
                        </div>
                        <div className="text-sm text-gray-500">{user.location}</div>
                        {user.preferredCenter && (
                          <div className="text-sm text-gray-500">
                            Preferred: {user.preferredCenter}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.spouseInfo && (
                          <div className="text-sm text-gray-900">
                            Spouse: {user.spouseInfo}
                          </div>
                        )}
                        {user.tryingDuration && (
                          <div className="text-sm text-gray-500">
                            Trying: {user.tryingDuration}
                          </div>
                        )}
                        {user.previousTreatments && (
                          <div className="text-sm text-gray-500">
                            Previous: {user.previousTreatments}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.appointmentDate ? (
                          <div className="flex items-center text-sm text-gray-900">
                            <CalendarIcon className="h-4 w-4 mr-1 text-green-500" />
                            <div>
                              <div>{formatDate(user.appointmentDate)}</div>
                              {user.appointmentTime && (
                                <div className="text-gray-500">{user.appointmentTime}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No appointment</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLeadStatusColor(user.leadStatus.toLowerCase())}`}>
                          {user.leadStatus}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Updated: {formatRelativeTime(user.updated_at)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
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

          {/* Results summary */}
          <div className="mt-4 text-center text-sm text-gray-600">
            {totalUsers > 0 ? (
              <>Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of {totalUsers.toLocaleString()} leads</>
            ) : (
              'No leads found'
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
