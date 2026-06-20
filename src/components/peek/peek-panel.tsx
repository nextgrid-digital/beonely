import type { ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface PeekPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** Slot rendered before the title/description (e.g. a company logo avatar). */
  leading?: ReactNode
  /** Slot for header actions (e.g. an "Open full page" link). Rendered left of the close button. */
  headerActions?: ReactNode
  /**
   * Render the header title/description visually hidden (still announced to
   * assistive tech). Use when the body supplies its own visible heading.
   */
  hideHeader?: boolean
  /**
   * Content for a top toolbar shown next to a left-aligned close button. When
   * set, the built-in top-right close button is replaced by this toolbar.
   */
  topBar?: ReactNode
  /** Right-aligned actions for the top toolbar (e.g. a primary CTA). */
  topBarActions?: ReactNode
  children: ReactNode
  /** Override the docked panel sizing/shell classes. */
  className?: string
  /** Classes applied to the scrollable body wrapper. */
  bodyClassName?: string
}

/**
 * Notion-style right-docked side-peek built on the shadcn Sheet. The list stays
 * behind a dimmed backdrop; Esc, an outside click, and the built-in close button
 * all dismiss it (provided by Radix Dialog under the hood).
 */
export function PeekPanel({
  open,
  onOpenChange,
  title,
  description,
  leading,
  headerActions,
  hideHeader,
  topBar,
  topBarActions,
  children,
  className,
  bodyClassName,
}: PeekPanelProps) {
  const showToolbar = Boolean(topBar || topBarActions)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        hideCloseButton={showToolbar}
        className={cn(
          'flex w-full flex-col gap-0 overflow-hidden border-s p-0 sm:max-w-xl lg:max-w-3xl xl:max-w-4xl',
          className
        )}
      >
        {hideHeader ? (
          <SheetHeader className='sr-only'>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description ?? 'Detail panel'}</SheetDescription>
          </SheetHeader>
        ) : (
          <SheetHeader className='shrink-0 gap-1.5 border-b border-border p-4 pe-14'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex min-w-0 flex-1 items-start gap-3'>
                {leading ? <div className='shrink-0'>{leading}</div> : null}
                <div className='min-w-0 flex-1'>
                  <SheetTitle className='truncate text-base'>
                    {title}
                  </SheetTitle>
                  {description ? (
                    <SheetDescription className='mt-1 line-clamp-2'>
                      {description}
                    </SheetDescription>
                  ) : (
                    <SheetDescription className='sr-only'>
                      Detail panel
                    </SheetDescription>
                  )}
                </div>
              </div>
              {headerActions ? (
                <div className='flex shrink-0 items-center gap-2'>
                  {headerActions}
                </div>
              ) : null}
            </div>
          </SheetHeader>
        )}
        {showToolbar ? (
          <div className='flex shrink-0 flex-wrap items-center gap-2 px-4 pt-4'>
            <SheetClose className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-80 transition-opacity hover:bg-muted hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none'>
              <XIcon className='size-4' />
              <span className='sr-only'>Close</span>
            </SheetClose>
            <div className='min-w-0 flex-1 text-sm text-muted-foreground'>
              {topBar}
            </div>
            {topBarActions ? (
              <div className='shrink-0'>{topBarActions}</div>
            ) : null}
          </div>
        ) : null}
        <div className={cn('min-h-0 flex-1 overflow-y-auto', bodyClassName)}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
