import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn, formatNumber } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  change?: number
  changeLabel?: string
  icon?: ReactNode
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red'
  loading?: boolean
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'blue',
  loading = false,
}: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icon && (
              <div className={cn('p-3 rounded-lg shadow-sm', colorClasses[color])}>
                <div className="h-6 w-6 text-white">{icon}</div>
              </div>
            )}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate mb-1">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-3xl font-bold text-gray-900">
                  {typeof value === 'number' ? formatNumber(value) : value}
                </div>
                {change !== undefined && (
                  <div className={cn(
                    'ml-3 flex items-center text-sm font-semibold px-2 py-1 rounded-full',
                    change >= 0 
                      ? 'text-green-700 bg-green-100' 
                      : 'text-red-700 bg-red-100'
                  )}>
                    <span className="mr-1">
                      {change >= 0 ? '↗' : '↘'}
                    </span>
                    {Math.abs(change)}%
                  </div>
                )}
              </dd>
              {changeLabel && (
                <dd className="text-xs text-gray-500 mt-1">
                  {changeLabel}
                </dd>
              )}
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
