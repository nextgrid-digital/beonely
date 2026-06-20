import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

export type InboxPillVariant =
  | 'ai_draft'
  | 'attention'
  | 'overdue'
  | 'danger'
  | 'success'
  | 'info'
  | 'monitoring'
  | 'muted'

export interface InboxPillItem {
  label: string
  variant: InboxPillVariant
  icon?: ComponentType<{ className?: string }>
}

const pillVariantClasses: Record<InboxPillVariant, string> = {
  ai_draft:
    'bg-violet-100 text-violet-800 ring-1 ring-violet-200/80 dark:bg-violet-950/70 dark:text-violet-200 dark:ring-violet-700/50',
  attention:
    'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  success:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  monitoring: 'bg-muted text-muted-foreground ring-1 ring-border',
  muted: 'bg-muted/60 text-muted-foreground',
}

interface InboxStatusPillProps {
  label: string
  variant: InboxPillVariant
  icon?: ComponentType<{ className?: string }>
  className?: string
}

export function InboxStatusPill({
  label,
  variant,
  icon: Icon,
  className,
}: InboxStatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        pillVariantClasses[variant],
        className
      )}
    >
      {Icon ? (
        <Icon className='size-3 shrink-0 opacity-90' aria-hidden />
      ) : null}
      {label}
    </span>
  )
}
