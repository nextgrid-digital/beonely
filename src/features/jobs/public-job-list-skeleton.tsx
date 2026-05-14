import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function PublicJobCardSkeleton() {
  return (
    <Card className='rounded-none border-0 border-b border-border bg-card shadow-none'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0 pb-2'>
        <div className='flex min-w-0 flex-1 gap-3'>
          <Skeleton className='size-11 shrink-0 rounded-md' />
          <div className='min-w-0 flex-1 space-y-2'>
            <Skeleton className='h-6 w-[min(100%,20rem)]' />
            <Skeleton className='h-4 w-48' />
            <Skeleton className='h-12 w-full max-w-xl' />
          </div>
        </div>
        <Skeleton className='h-8 w-[4.5rem] shrink-0 rounded-md' />
      </CardHeader>
      <CardContent className='flex flex-wrap gap-2'>
        <Skeleton className='h-5 w-16 rounded-full' />
        <Skeleton className='h-5 w-20 rounded-full' />
        <Skeleton className='h-5 w-14 rounded-full' />
      </CardContent>
    </Card>
  )
}

export function PublicJobListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className='grid gap-4' role='status' aria-label='Loading job listings'>
      {Array.from({ length: count }, (_, i) => (
        <PublicJobCardSkeleton key={i} />
      ))}
    </div>
  )
}
