import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface InboxFilterPill<T extends string = string> {
  id: T
  label: string
  count: number
}

interface InboxFilterPillsProps<T extends string> {
  pills: InboxFilterPill<T>[]
  activeId: T
  onChange: (id: T) => void
  /** Shared layout id for the animated active background; unique per surface. */
  layoutId: string
  className?: string
}

export function InboxFilterPills<T extends string>({
  pills,
  activeId,
  onChange,
  layoutId,
  className,
}: InboxFilterPillsProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const pillCountsKey = pills.map((pill) => pill.count).join(',')

  const updateFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const hasOverflow = el.scrollWidth > el.clientWidth + 1
    const atStart = el.scrollLeft <= 1
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
    setShowLeftFade(hasOverflow && !atStart)
    setShowRightFade(hasOverflow && !atEnd)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    updateFade()
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateFade)
    })

    const observer = new ResizeObserver(updateFade)
    observer.observe(el)
    el.addEventListener('scroll', updateFade, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      el.removeEventListener('scroll', updateFade)
    }
  }, [updateFade, pillCountsKey])

  return (
    <div className={cn('relative max-w-full min-w-0 overflow-hidden', className)}>
      <div
        ref={scrollRef}
        className='flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-4 whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
      >
        {pills.map((pill) => {
          const isActive = activeId === pill.id
          return (
            <button
              key={pill.id}
              type='button'
              aria-pressed={isActive}
              onClick={() => onChange(pill.id)}
              className={cn(
                'relative inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId={layoutId}
                  className='absolute inset-0 rounded-md bg-muted'
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              ) : null}
              <span className='relative z-[1]'>{pill.label}</span>
              <span className='relative z-[1] text-muted-foreground tabular-nums'>
                {pill.count}
              </span>
            </button>
          )
        })}
      </div>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-0 bottom-4 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent transition-opacity duration-200',
          showLeftFade ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-0 right-0 bottom-4 z-10 w-12 bg-gradient-to-l from-background to-transparent transition-opacity duration-200',
          showRightFade ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
