import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPageNumbers } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function PublicJobsPagination(props: {
  currentPage: number
  totalPages: number
  totalJobs: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const { currentPage, totalPages, totalJobs, pageSize, onPageChange } = props
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalJobs)

  return (
    <nav
      aria-label='Jobs pagination'
      className='flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between'
    >
      <p className='text-sm text-muted-foreground'>
        Showing {start}-{end} of {totalJobs} roles
      </p>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-9'
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <span className='sr-only'>Go to previous page</span>
          <ChevronLeft className='size-4' aria-hidden />
        </Button>
        {pageNumbers.map((pageNumber, index) => {
          if (pageNumber === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className='px-1 text-sm text-muted-foreground'
                aria-hidden
              >
                ...
              </span>
            )
          }
          const page = Number(pageNumber)
          return (
            <Button
              key={page}
              type='button'
              variant={page === currentPage ? 'default' : 'outline'}
              className='h-9 min-w-9 px-3'
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              <span className='sr-only'>Go to page </span>
              {page}
            </Button>
          )
        })}
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-9'
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span className='sr-only'>Go to next page</span>
          <ChevronRight className='size-4' aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
