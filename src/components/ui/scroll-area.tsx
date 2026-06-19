'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import {
  ScrollEdgeCue,
  useScrollEdges,
  type ScrollEdgeCueSize,
} from '@/lib/scroll-fade'
import { useShape } from '@/lib/shape-context'
import { cn } from '@/lib/utils'
import { useTouchPrimary } from '@/hooks/use-touch-primary'

const ScrollAreaContext = createContext<boolean>(false)

type Orientation = 'vertical' | 'horizontal' | 'both'

interface ScrollAreaProps extends ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> {
  viewportClassName?: string
  scrollFade?: boolean
  cueSize?: ScrollEdgeCueSize
  chevron?: boolean
  orientation?: Orientation
}

const ScrollArea = forwardRef<
  ComponentRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      children,
      scrollHideDelay = 0,
      viewportClassName,
      scrollFade = true,
      cueSize = 'comfortable',
      chevron = true,
      orientation = 'vertical',
      ...props
    },
    ref
  ) => {
    const viewportRef = useRef<HTMLDivElement>(null)
    const isTouch = useTouchPrimary()
    const edges = useScrollEdges(viewportRef, {
      enabled: scrollFade,
      axis: orientation,
    })

    const cues = scrollFade && (
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]'
      >
        {orientation !== 'horizontal' && (
          <>
            <ScrollEdgeCue
              mode='absolute'
              edge='top'
              visible={edges.top}
              size={cueSize}
              chevron={chevron}
            />
            <ScrollEdgeCue
              mode='absolute'
              edge='bottom'
              visible={edges.bottom}
              size={cueSize}
              chevron={chevron}
            />
          </>
        )}
        {orientation !== 'vertical' && (
          <>
            <ScrollEdgeCue
              mode='absolute'
              edge='left'
              visible={edges.left}
              size={cueSize}
              chevron={chevron}
            />
            <ScrollEdgeCue
              mode='absolute'
              edge='right'
              visible={edges.right}
              size={cueSize}
              chevron={chevron}
            />
          </>
        )}
      </div>
    )

    return (
      <ScrollAreaContext.Provider value={isTouch}>
        {isTouch ? (
          <div
            ref={ref}
            role='group'
            data-slot='scroll-area'
            aria-roledescription='scroll area'
            className={cn('relative overflow-hidden', className)}
            {...props}
          >
            <div
              ref={viewportRef}
              data-slot='scroll-area-viewport'
              className={cn(
                'size-full rounded-[inherit]',
                orientation === 'vertical' && 'overflow-y-auto',
                orientation === 'horizontal' && 'overflow-x-auto',
                orientation === 'both' && 'overflow-auto',
                viewportClassName
              )}
              tabIndex={0}
            >
              {children}
            </div>
            {cues}
          </div>
        ) : (
          <ScrollAreaPrimitive.Root
            ref={ref}
            data-slot='scroll-area'
            scrollHideDelay={scrollHideDelay}
            className={cn('relative overflow-hidden', className)}
            {...props}
          >
            <ScrollAreaPrimitive.Viewport
              ref={viewportRef}
              data-slot='scroll-area-viewport'
              className={cn('size-full rounded-[inherit]', viewportClassName)}
            >
              {children}
            </ScrollAreaPrimitive.Viewport>
            {cues}
            {orientation !== 'horizontal' && (
              <ScrollBar orientation='vertical' />
            )}
            {orientation !== 'vertical' && (
              <ScrollBar orientation='horizontal' />
            )}
            {orientation === 'both' && <ScrollAreaPrimitive.Corner />}
          </ScrollAreaPrimitive.Root>
        )}
      </ScrollAreaContext.Provider>
    )
  }
)

ScrollArea.displayName = 'ScrollArea'

const ScrollBar = forwardRef<
  ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => {
  const isTouch = useContext(ScrollAreaContext)
  const shape = useShape()

  if (isTouch) return null

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      data-slot='scroll-area-scrollbar'
      className={cn(
        'group/scrollbar z-20 flex touch-none select-none',
        'transition-opacity duration-[120ms] ease-out data-[state=visible]:duration-[160ms]',
        'data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100',
        'data-[state=hidden]:delay-[160ms] data-[state=visible]:delay-0',
        orientation === 'vertical' && 'h-full w-2.5',
        orientation === 'horizontal' && 'h-2.5 w-full flex-col',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot='scroll-area-thumb'
        className={cn(
          'relative bg-foreground/25 transition-[background-color,width,height] duration-[160ms] ease-in-out',
          'group-hover/scrollbar:bg-foreground/45 active:!bg-foreground/60',
          shape.bg,
          orientation === 'vertical' &&
            'mx-auto my-1 w-1 group-hover/scrollbar:w-1.5',
          orientation === 'horizontal' &&
            'mx-1 my-auto h-1 group-hover/scrollbar:h-1.5'
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
})

ScrollBar.displayName = 'ScrollBar'

export { ScrollArea, ScrollBar }
export type { ScrollAreaProps }
