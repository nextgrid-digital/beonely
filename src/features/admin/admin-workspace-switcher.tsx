import {
  Briefcase,
  Globe,
  LayoutDashboard,
  UserCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ADMIN_WORKSPACE_LABELS,
  type AdminWorkspace,
} from '@/lib/auth/admin-workspace'
import { useAdminWorkspace } from '@/context/admin-workspace-provider'
import { cn } from '@/lib/utils'

const WORKSPACES: AdminWorkspace[] = [
  'admin',
  'recruiter',
  'candidate',
  'public',
]

const WORKSPACE_ICONS: Record<AdminWorkspace, LucideIcon> = {
  admin: LayoutDashboard,
  recruiter: Briefcase,
  candidate: UserCircle,
  public: Globe,
}

type AdminWorkspaceSwitcherProps = {
  compact?: boolean
  /** When true, collapse to icon-only like sidebar nav (admin shell). */
  sidebarIconMode?: boolean
  sidebarCollapsed?: boolean
}

export function AdminWorkspaceSwitcher({
  compact = false,
  sidebarIconMode = false,
  sidebarCollapsed = false,
}: AdminWorkspaceSwitcherProps) {
  const { workspace, isStaffAdmin, setWorkspace } = useAdminWorkspace()
  if (!isStaffAdmin) return null

  const ActiveIcon = WORKSPACE_ICONS[workspace]
  const activeMeta = ADMIN_WORKSPACE_LABELS[workspace]

  const triggerLabel = compact
    ? activeMeta.label
    : `${activeMeta.label} — ${activeMeta.description}`

  const trigger = (
    <SelectTrigger
      className={cn(
        compact ? 'h-8 w-[140px]' : 'w-full',
        // Radix clones ItemText into [data-slot=select-value]; hide it (sr-only loses to *:flex rules on SelectTrigger).
        '[&_[data-slot=select-value]]:hidden',
        sidebarIconMode &&
          'gap-2 border-sidebar-border bg-sidebar-accent/30 shadow-none hover:bg-sidebar-accent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:min-w-0! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&>svg:last-child]:hidden group-data-[collapsible=icon]:[&_[data-slot=workspace-label]]:sr-only'
      )}
      aria-label={`Switch workspace (${triggerLabel})`}
    >
      <ActiveIcon
        className='size-4 shrink-0 text-sidebar-foreground'
        aria-hidden
      />
      <span
        data-slot='workspace-label'
        className='min-w-0 flex-1 truncate text-start'
      >
        <span className='font-medium'>{activeMeta.label}</span>
        {!compact ? (
          <span className='text-muted-foreground'>
            {' '}
            — {activeMeta.description}
          </span>
        ) : null}
      </span>
      <SelectValue aria-hidden className='hidden' />
    </SelectTrigger>
  )

  const select = (
    <Select
      value={workspace}
      onValueChange={(v) => void setWorkspace(v as AdminWorkspace)}
    >
      {sidebarIconMode && sidebarCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side='right' align='center'>
            {activeMeta.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <SelectContent>
        {WORKSPACES.map((w) => {
          const Icon = WORKSPACE_ICONS[w]
          return (
            <SelectItem
              key={w}
              value={w}
              textValue={
                compact
                  ? ADMIN_WORKSPACE_LABELS[w].label
                  : `${ADMIN_WORKSPACE_LABELS[w].label} — ${ADMIN_WORKSPACE_LABELS[w].description}`
              }
            >
              <Icon className='size-4 shrink-0 text-muted-foreground' aria-hidden />
              <span className='font-medium'>{ADMIN_WORKSPACE_LABELS[w].label}</span>
              {!compact ? (
                <span className='text-muted-foreground'>
                  — {ADMIN_WORKSPACE_LABELS[w].description}
                </span>
              ) : null}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )

  return select
}
