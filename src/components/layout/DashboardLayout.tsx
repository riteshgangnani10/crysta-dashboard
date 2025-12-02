'use client'

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { RealtimeIndicator } from '@/components/ui/RealtimeStatus'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none md:ml-64">
            <div className="py-8">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-10">
                {children}
              </div>
            </div>
          </main>
        </div>
        <RealtimeIndicator />
      </div>
    </div>
  )
}
