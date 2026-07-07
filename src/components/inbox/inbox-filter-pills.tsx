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
  paddingClassName?: string
}

export function InboxFilterPills<T extends string>({
  pills,
  activeId,
  onChange,
  layoutId,
  className,
  paddingClassName = 'px-4',
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
        className={cn(
          'flex gap-2 overflow-x-auto overscroll-x-contain pb-4 whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          paddingClassName
        )}
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
                'relative inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-3 text-xs font-medium transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'border-border bg-background text-foreground shadow-xs'
                  : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId={layoutId}
                  className='absolute inset-0 rounded-md border border-border bg-background shadow-xs'
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
