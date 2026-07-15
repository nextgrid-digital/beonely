import {
  memo,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react'
import { motion } from 'motion/react'
import { formatListTimestamp } from '@/lib/list/format-list-timestamp'
import { cn } from '@/lib/utils'
import { InboxStatusPill, type InboxPillItem } from './inbox-status-pill'

export interface InboxRowData {
  id: string
  unread?: boolean
  /** Optional leading slot (avatar/logo). Falls back to the unread dot. */
  leading?: ReactNode
  title: string
  preview?: string
  /** Right-aligned status pills (keep to ~2 for the cleanest layout). */
  pills?: InboxPillItem[]
  /** Trailing relative timestamp source. */
  timestamp?: string | Date
  deemphasized?: boolean
}

interface InboxListRowProps {
  row: InboxRowData
  selected: boolean
  onSelect: (id: string) => void
  /** Shared layout id for the animated selection accent; unique per surface. */
  selectionLayoutId: string
}

function InboxListRowComponent({
  row,
  selected,
  onSelect,
  selectionLayoutId,
}: InboxListRowProps) {
  const showUnread = Boolean(row.unread)
  const isDeemphasized = Boolean(row.deemphasized)

  const handleMouseDown: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault()
  }

  const handleSelect = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.focus({ preventScroll: true })
    onSelect(row.id)
  }

  return (
    <button
      type='button'
      onMouseDown={handleMouseDown}
      onClick={handleSelect}
      className={cn(
        'relative flex w-full items-center gap-3 border-l-2 border-l-transparent px-4 py-2.5 text-left transition-colors duration-150 outline-none hover:bg-muted/40 focus-visible:bg-muted/40 motion-reduce:transition-none',
        isDeemphasized && !selected && 'opacity-80'
      )}
    >
      {selected ? (
        <motion.span
          layoutId={selectionLayoutId}
          className='absolute inset-0 border-l-2 border-l-primary bg-muted/60'
          transition={{ type: 'spring', stiffness: 480, damping: 38 }}
        />
      ) : null}

      <div className='relative z-[1] flex shrink-0 items-center justify-center'>
        {row.leading ? (
          row.leading
        ) : (
          <span className='flex w-3 items-center justify-center'>
            {showUnread ? (
              <span
                className='size-1.5 shrink-0 rounded-full bg-primary'
                aria-hidden
              />
            ) : (
              <span className='size-1.5 shrink-0' aria-hidden />
            )}
          </span>
        )}
      </div>

      <div className='relative z-[1] flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex-row sm:items-baseline sm:gap-1.5'>
        <span
          className={cn(
            'min-w-0 truncate text-sm sm:shrink-0',
            showUnread ? 'font-semibold' : 'font-medium'
          )}
        >
          {row.title}
        </span>
        {row.preview ? (
          <span className='min-w-0 truncate text-sm text-muted-foreground'>
            {row.preview}
          </span>
        ) : null}
      </div>

      {row.pills && row.pills.length > 0 ? (
        <div className='relative z-[1] hidden shrink-0 flex-wrap items-center justify-end gap-1 sm:flex'>
          {row.pills.map((pill, index) => (
            <InboxStatusPill
              key={`${pill.label}-${index}`}
              label={pill.label}
              variant={pill.variant}
              icon={pill.icon}
            />
          ))}
        </div>
      ) : null}

      {row.timestamp ? (
        <time
          className='relative z-[1] hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block'
          dateTime={new Date(row.timestamp).toISOString()}
        >
          {formatListTimestamp(row.timestamp)}
        </time>
      ) : null}
    </button>
  )
}

export const InboxListRow = memo(InboxListRowComponent)
