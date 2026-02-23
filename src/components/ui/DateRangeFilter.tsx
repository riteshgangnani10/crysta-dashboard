'use client'

import { format, startOfDay, subDays, startOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'

export type DatePreset = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'allTime' | 'custom'

export interface DateRange {
  from: string | null  // "YYYY-MM-DD"
  to: string | null    // "YYYY-MM-DD"
}

export interface DateRangeFilterProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  activePreset: DatePreset
  onPresetChange: (preset: DatePreset) => void
  className?: string
}

function getDateRangeForPreset(preset: DatePreset): DateRange {
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'last7days':
      return { from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: today }
    case 'last30days':
      return { from: format(subDays(new Date(), 29), 'yyyy-MM-dd'), to: today }
    case 'thisMonth':
      return { from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: today }
    case 'allTime':
      return { from: null, to: null }
    case 'custom':
      return { from: null, to: null }
  }
}

const presets: { key: DatePreset; label: string }[] = [
  { key: 'allTime', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: 'Last 7d' },
  { key: 'last30days', label: 'Last 30d' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
]

export function DateRangeFilter({
  dateRange,
  onDateRangeChange,
  activePreset,
  onPresetChange,
  className,
}: DateRangeFilterProps) {
  const handlePresetClick = (preset: DatePreset) => {
    onPresetChange(preset)
    if (preset !== 'custom') {
      onDateRangeChange(getDateRangeForPreset(preset))
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Date Range:</span>
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePresetClick(p.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              activePreset === p.key
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activePreset === 'custom' && (
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={dateRange.from || ''}
              onChange={(e) =>
                onDateRangeChange({ ...dateRange, from: e.target.value || null })
              }
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={dateRange.to || ''}
              onChange={(e) =>
                onDateRangeChange({ ...dateRange, to: e.target.value || null })
              }
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
