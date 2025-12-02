'use client'

import { 
  PhoneIcon, 
  MapPinIcon, 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ChevronRightIcon 
} from '@heroicons/react/24/outline'
import { 
  getInitials, 
  formatPhoneNumber, 
  formatRelativeTime, 
  truncateText,
  getAvatarColor,
  getLeadStatusColor 
} from '@/lib/dataTransformers'

export interface ConversationSummary {
  sessionId: string
  phone: string
  name: string | null
  city: string | null
  age: number | null
  leadStatus: string | null
  messageCount: number
  userMessageCount: number
  aiMessageCount: number
  lastMessage: string
  lastMessageType: 'human' | 'ai'
  lastActivity: string
  firstActivity: string
}

interface ConversationCardProps {
  conversation: ConversationSummary
  onClick: () => void
  isSelected?: boolean
}

export function ConversationCard({ conversation, onClick, isSelected }: ConversationCardProps) {
  const displayName = conversation.name || 'Unknown User'
  const initials = getInitials(displayName)
  const avatarColor = getAvatarColor(conversation.phone)
  const statusColor = getLeadStatusColor(conversation.leadStatus || 'incomplete')

  return (
    <div
      onClick={onClick}
      className={`
        group relative p-4 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md' 
          : 'bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 hover:shadow-lg'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor}
          flex items-center justify-center text-white font-semibold text-sm shadow-md
        `}>
          {initials}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Name and Phone Row */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <PhoneIcon className="w-3 h-3" />
              {formatPhoneNumber(conversation.phone)}
            </span>
          </div>

          {/* Location and Age Badges */}
          <div className="flex items-center gap-2 mb-2">
            {conversation.city && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <MapPinIcon className="w-3 h-3" />
                {conversation.city}
              </span>
            )}
            {conversation.age && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {conversation.age} yrs
              </span>
            )}
            {conversation.leadStatus && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {conversation.leadStatus}
              </span>
            )}
          </div>

          {/* Last Message Preview */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            <span className={`
              inline-block w-2 h-2 rounded-full mr-2
              ${conversation.lastMessageType === 'human' ? 'bg-blue-500' : 'bg-emerald-500'}
            `} />
            {truncateText(conversation.lastMessage, 120)}
          </p>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
              {conversation.messageCount} messages
            </span>
            <span className="text-blue-500">{conversation.userMessageCount} user</span>
            <span className="text-emerald-500">{conversation.aiMessageCount} AI</span>
            <span className="flex items-center gap-1 ml-auto">
              <ClockIcon className="w-3.5 h-3.5" />
              {formatRelativeTime(conversation.lastActivity)}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  )
}

// Loading skeleton for conversation cards
export function ConversationCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-white border border-gray-100 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="flex gap-2 mb-2">
            <div className="h-5 bg-gray-200 rounded-full w-20" />
            <div className="h-5 bg-gray-200 rounded-full w-16" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

