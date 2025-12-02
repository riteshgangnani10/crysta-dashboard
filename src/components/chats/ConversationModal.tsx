'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  XMarkIcon, 
  PhoneIcon, 
  MapPinIcon, 
  CalendarIcon,
  UserIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { 
  getInitials, 
  formatPhoneNumber, 
  formatChatTimestamp,
  extractAIOutput,
  extractUserDataFromAI,
  getAvatarColor,
  getLeadStatusColor,
  formatRelativeTime
} from '@/lib/dataTransformers'
import { ConversationSummary } from './ConversationCard'

interface Message {
  id: number
  type: 'human' | 'ai'
  content: string
  timestamp: string
  extractedData?: ReturnType<typeof extractUserDataFromAI>
}

interface ConversationModalProps {
  conversation: ConversationSummary
  onClose: () => void
}

export function ConversationModal({ conversation, onClose }: ConversationModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<{
    name: string | null
    city: string | null
    age: number | null
    leadStatus: string | null
    spouseName: string | null
    spouseAge: string | null
    tryingDuration: string | null
    previousTreatments: string | null
    preferredCenter: string | null
    appointmentDate: string | null
    appointmentTime: string | null
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    loadUserData()
  }, [conversation.sessionId])

  useEffect(() => {
    // Scroll to bottom when messages load
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('session_id', conversation.sessionId)
        .order('timestamp', { ascending: true })

      if (error) throw error

      const processedMessages: Message[] = (data || []).map(msg => {
        const isAI = msg.message?.type === 'ai'
        let content = msg.message?.content || ''
        let extractedData = null

        if (isAI) {
          content = extractAIOutput(content)
          extractedData = extractUserDataFromAI(msg.message?.content || '')
        }

        return {
          id: msg.id,
          type: msg.message?.type || 'human',
          content,
          timestamp: msg.timestamp,
          extractedData
        }
      })

      setMessages(processedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserData = async () => {
    try {
      // First try to get from users table
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', conversation.sessionId)
        .single()

      if (user) {
        setUserData({
          name: user.full_name,
          city: user.user_city,
          age: user.age,
          leadStatus: user.lead_status,
          spouseName: user.spouse_name,
          spouseAge: user.spouse_age,
          tryingDuration: user.trying_duration,
          previousTreatments: user.previous_treatments,
          preferredCenter: user.preferred_center,
          appointmentDate: user.appointment_date,
          appointmentTime: user.appointment_time
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const displayName = userData?.name || conversation.name || 'Unknown User'
  const initials = getInitials(displayName)
  const avatarColor = getAvatarColor(conversation.phone)
  const statusColor = getLeadStatusColor(userData?.leadStatus || conversation.leadStatus || 'incomplete')

  // Calculate conversation duration
  const firstMessage = messages[0]
  const lastMessage = messages[messages.length - 1]
  const duration = firstMessage && lastMessage 
    ? Math.round((new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime()) / 60000)
    : 0

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white rounded-2xl shadow-2xl overflow-hidden flex animate-in slide-in-from-bottom-4 duration-300">
        {/* User Profile Sidebar */}
        <div className="w-80 bg-gradient-to-b from-slate-50 to-white border-r border-gray-200 flex flex-col">
          {/* Profile Header */}
          <div className="p-6 text-center border-b border-gray-100">
            <div className={`
              w-20 h-20 rounded-full bg-gradient-to-br ${avatarColor}
              flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg
            `}>
              {initials}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{displayName}</h2>
            <a 
              href={`tel:${conversation.phone}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <PhoneIcon className="w-4 h-4" />
              {formatPhoneNumber(conversation.phone)}
            </a>
          </div>

          {/* User Info */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Lead Status */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lead Status</h3>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusColor}`}>
                {userData?.leadStatus || conversation.leadStatus || 'Incomplete'}
              </span>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Info</h3>
              <div className="space-y-3">
                {(userData?.city || conversation.city) && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{userData?.city || conversation.city}</span>
                  </div>
                )}
                {(userData?.age || conversation.age) && (
                  <div className="flex items-center gap-3 text-sm">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{userData?.age || conversation.age} years old</span>
                  </div>
                )}
              </div>
            </div>

            {/* Family Info */}
            {(userData?.spouseName || userData?.spouseAge || userData?.tryingDuration) && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Family Info</h3>
                <div className="space-y-3">
                  {userData.spouseName && (
                    <div className="flex items-center gap-3 text-sm">
                      <HeartIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Spouse: {userData.spouseName}</span>
                    </div>
                  )}
                  {userData.spouseAge && (
                    <div className="flex items-center gap-3 text-sm">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Spouse Age: {userData.spouseAge}</span>
                    </div>
                  )}
                  {userData.tryingDuration && (
                    <div className="flex items-center gap-3 text-sm">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Trying: {userData.tryingDuration}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Medical Info */}
            {(userData?.previousTreatments || userData?.preferredCenter) && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Medical Info</h3>
                <div className="space-y-3">
                  {userData.previousTreatments && (
                    <div className="flex items-start gap-3 text-sm">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-700">Previous: {userData.previousTreatments}</span>
                    </div>
                  )}
                  {userData.preferredCenter && (
                    <div className="flex items-center gap-3 text-sm">
                      <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{userData.preferredCenter}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Appointment */}
            {userData?.appointmentDate && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Appointment Scheduled</h3>
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-800 font-medium">
                    {userData.appointmentDate} {userData.appointmentTime && `at ${userData.appointmentTime}`}
                  </span>
                </div>
              </div>
            )}

            {/* Conversation Stats */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversation Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{conversation.messageCount}</div>
                  <div className="text-xs text-gray-500">Messages</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{duration}m</div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-900">Conversation</h3>
                <p className="text-xs text-gray-500">
                  Started {formatRelativeTime(conversation.firstActivity)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50 to-white">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message, index) => {
                  const isUser = message.type === 'human'
                  const showTimestamp = index === 0 || 
                    new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 300000 // 5 min gap

                  return (
                    <div key={message.id}>
                      {showTimestamp && (
                        <div className="text-center my-4">
                          <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                            {formatChatTimestamp(message.timestamp)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                          max-w-[80%] rounded-2xl px-4 py-3 shadow-sm
                          ${isUser 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                          }
                        `}>
                          {!isUser && (
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">C</span>
                              </div>
                              <span className="text-xs font-medium text-emerald-600">Crysta AI</span>
                            </div>
                          )}
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-white' : 'text-gray-700'}`}>
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

