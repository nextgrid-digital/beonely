import { cn } from '@/lib/utils'

export const META_CONTROL = cn(
  'h-7 w-auto min-w-0 rounded-full border border-border bg-background px-2.5 text-xs shadow-xs',
  '[&_svg]:size-3'
)

export const META_SELECT_TRIGGER = cn(META_CONTROL, 'gap-1')
