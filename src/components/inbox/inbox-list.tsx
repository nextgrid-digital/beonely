import { type ReactNode } from 'react'
import { LayoutGroup } from 'motion/react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { groupByDate } from '@/lib/list/group-by-date'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  InboxFilterPills,
  type InboxFilterPill,
} from './inbox-filter-pills'
import { InboxListRow, type InboxRowData } from './inbox-list-row'

interface InboxListProps<T extends string> {
  /** Page heading rendered above the search box (e.g. "Inbox", "Open roles"). */
  title?: ReactNode
  /** Optional trailing controls rendered next to the title (e.g. a Filters button). */
  titleActions?: ReactNode

  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string

  pills: InboxFilterPill<T>[]
  activeFilter: T
  onFilterChange: (id: T) => void
  /** Unique per surface to keep the pill + selection animations isolated. */
  layoutId: string

  /** Rendered at the end of the tab row (e.g. active-filter chips + a Filters button). */
  pillsTrailing?: ReactNode

  rows: InboxRowData[]
  selectedId: string | null
  onSelect: (id: string) => void

  loading?: boolean
  /** Background refetch in progress: dims the existing rows without removing them. */
  busy?: boolean
  emptyMessage: string
  className?: string
  /** Sticky offset for date-group headers (e.g. `top-14` below a fixed site header). */
  stickyTopClassName?: string
}

const SKELETON_ROWS = 6

export function InboxList<T extends string>({
  title,
  titleActions,
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  pills,
  activeFilter,
  onFilterChange,
  layoutId,
  pillsTrailing,
  rows,
  selectedId,
  onSelect,
  loading = false,
  busy = false,
  emptyMessage,
  className,
  stickyTopClassName = 'top-0',
}: InboxListProps<T>) {
  const groups = groupByDate(rows, (row) => row.timestamp)
  const selectionLayoutId = `${layoutId}-selection`

  return (
    <div
      className={cn(
        'mx-auto flex h-full max-w-5xl min-w-0 flex-col',
        className
      )}
    >
      <div className='min-w-0 shrink-0'>
        {title || titleActions ? (
          <div className='flex items-center justify-between gap-3 px-4 py-4'>
            {title ? (
              <h1 className='text-lg font-semibold tracking-tight'>{title}</h1>
            ) : (
              <span />
            )}
            {titleActions ? (
              <div className='flex shrink-0 items-center gap-2'>
                {titleActions}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className='px-4 pb-4'>
          <div className='relative'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className='h-9 border-0 bg-muted/50 pl-9 text-sm shadow-none'
            />
          </div>
        </div>

        <div className='flex items-end gap-2 pr-4'>
          <InboxFilterPills
            className='min-w-0 flex-1'
            pills={pills}
            activeId={activeFilter}
            onChange={onFilterChange}
            layoutId={layoutId}
          />
          {pillsTrailing ? (
            <div className='mb-4 shrink-0'>{pillsTrailing}</div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className='flex-1 space-y-2 px-4 py-4'>
          {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
            <div key={index} className='flex items-center gap-3 py-1.5'>
              <Skeleton className='size-1.5 rounded-full' />
              <Skeleton className='h-4 w-40' />
              <Skeleton className='h-4 flex-1' />
              <Skeleton className='h-4 w-12' />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className='px-4 py-12 text-center text-sm text-muted-foreground'>
          {emptyMessage}
        </p>
      ) : (
        <div
          className={cn(
            'min-w-0 transition-opacity duration-200 motion-reduce:transition-none',
            busy && 'opacity-70'
          )}
          aria-busy={busy || undefined}
        >
          <LayoutGroup id={layoutId}>
            <div className='pb-4'>
              {groups.map((group, groupIndex) => {
                const followsToday =
                  groupIndex > 0 && groups[groupIndex - 1]?.label === null
                return (
                  <section
                    key={group.id}
                    className={cn(
                      group.label &&
                        groupIndex > 0 &&
                        (followsToday ? 'mt-4' : 'mt-6')
                    )}
                  >
                    {group.label ? (
                      <div
                        className={cn('sticky z-10 bg-background', stickyTopClassName)}
                      >
                        <h2 className='px-4 py-2.5 text-xs font-medium text-muted-foreground'>
                          {group.label}
                        </h2>
                      </div>
                    ) : null}
                    <ul>
                      {group.items.map((row) => (
                        <li key={row.id}>
                          <InboxListRow
                            row={row}
                            selected={selectedId === row.id}
                            onSelect={onSelect}
                            selectionLayoutId={selectionLayoutId}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          </LayoutGroup>
        </div>
      )}
    </div>
  )
}
