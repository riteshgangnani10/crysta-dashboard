'use client'

import { useRealtimeConnection } from '@/hooks/useRealtime'

export function RealtimeStatus() {
  const { isConnected, connectionStatus } = useRealtimeConnection()

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span className={`${
        isConnected ? 'text-green-700' : 'text-red-700'
      }`}>
        {isConnected ? 'Real-time Connected' : `Disconnected (${connectionStatus})`}
      </span>
    </div>
  )
}

export function RealtimeIndicator({ show = true }: { show?: boolean }) {
  const { isConnected } = useRealtimeConnection()

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span>
            {isConnected ? 'Live Updates' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  )
}
