import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'pulse',
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded h-4',
        variant === 'rectangular' && 'rounded-md',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]',
        className
      )}
    />
  )
}

// Blog Card Skeleton
export function BlogCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <Skeleton className="h-48 w-full" variant="rectangular" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-5/6" variant="text" />
        <div className="flex items-center gap-4 pt-4">
          <Skeleton className="h-10 w-10" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" variant="text" />
            <Skeleton className="h-3 w-1/4" variant="text" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Article Content Skeleton
export function ArticleContentSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-12 w-3/4 mx-auto" variant="text" />
      <Skeleton className="h-64 w-full" variant="rectangular" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-11/12" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-10/12" variant="text" />
      </div>
      <Skeleton className="h-48 w-full" variant="rectangular" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-9/12" variant="text" />
      </div>
    </div>
  )
}

// Chart Skeleton
export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Skeleton className="h-6 w-1/3 mb-6" variant="text" />
      <Skeleton className="h-64 w-full" variant="rectangular" />
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-4 w-1/4" variant="text" />
        <Skeleton className="h-4 w-1/4" variant="text" />
        <Skeleton className="h-4 w-1/4" variant="text" />
      </div>
    </div>
  )
}

// Table Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="p-4"><Skeleton className="h-4 w-full" /></th>
            <th className="p-4"><Skeleton className="h-4 w-full" /></th>
            <th className="p-4"><Skeleton className="h-4 w-full" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="p-4"><Skeleton className="h-4 w-full" /></td>
              <td className="p-4"><Skeleton className="h-4 w-full" /></td>
              <td className="p-4"><Skeleton className="h-4 w-full" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
