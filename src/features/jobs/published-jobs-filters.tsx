import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import type { PublishedJobsFilters } from '@/lib/jobs/fetch-published-jobs'
import { SERVICENOW_JOB_MODULES } from '@/lib/jobs/servicenow-job-taxonomy'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type FilterOption = { value: string; label: string }

const ROLE_OPTIONS: FilterOption[] = [
  { value: '_any', label: 'Any role' },
  { value: 'developer', label: 'Developer' },
  { value: 'architect', label: 'Architect' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'admin', label: 'Admin' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'manager', label: 'Manager' },
  { value: 'other', label: 'Other' },
]

const EXPERIENCE_OPTIONS: FilterOption[] = [
  { value: '_any', label: 'Any' },
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
]

const WORK_OPTIONS: FilterOption[] = [
  { value: '_any', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
]

const EMPLOYMENT_OPTIONS: FilterOption[] = [
  { value: '_any', label: 'Any' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
]

const MODULE_OPTIONS: FilterOption[] = [
  { value: '_any', label: 'Any module' },
  ...SERVICENOW_JOB_MODULES.map((m) => ({ value: m, label: m })),
]

const POSTED_OPTIONS: FilterOption[] = [
  { value: '_any', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

/** Detailed (non-search) filters, used for the popover, chips, and active count. */
const DETAILED_FILTER_DEFS: Array<{
  key: keyof PublishedJobsFilters
  options?: FilterOption[]
}> = [
  { key: 'role', options: ROLE_OPTIONS },
  { key: 'experience', options: EXPERIENCE_OPTIONS },
  { key: 'work', options: WORK_OPTIONS },
  { key: 'type', options: EMPLOYMENT_OPTIONS },
  { key: 'module', options: MODULE_OPTIONS },
  { key: 'posted', options: POSTED_OPTIONS },
  { key: 'location' },
]

/** Narrow enough for `/` (merged with `setup`) and legacy `/jobs/` redirect (same filter shape). */
export type PublishedJobsSearchState = PublishedJobsFilters & {
  setup?: string
  page?: number
  linkedinPage?: number
}

export type PublishedJobsNavigate = (opts: {
  search: true | ((prev: PublishedJobsSearchState) => PublishedJobsSearchState)
  /** Preserve scroll position on filter/search navigations. */
  resetScroll?: boolean
}) => void | Promise<void>

export function hasActivePublishedJobFilters(
  s: PublishedJobsSearchState
): boolean {
  return Boolean(
    s.q?.trim() ||
    s.role ||
    s.experience ||
    s.work ||
    s.type ||
    s.module ||
    s.posted ||
    s.location?.trim()
  )
}

export function clearPublishedJobSearchPreserveSetup(
  prev: PublishedJobsSearchState
): PublishedJobsSearchState {
  const next: PublishedJobsSearchState = {}
  if (prev.setup !== undefined && prev.setup !== '') {
    next.setup = prev.setup
  }
  return next
}

/** Sticky offset below fixed [`PublicSiteHeader`](./public-site-layout.tsx) (`h-14`). */
const STICKY_BELOW_HEADER = 'top-14'

type FilterOrientation = 'horizontal' | 'vertical'

type FilterControlsProps = {
  search: PublishedJobsSearchState
  navigate: PublishedJobsNavigate
}

/** Always-visible shortcuts; the same URL parameter powers detailed filters. */
export function PublishedJobsDateFilters({
  search,
  navigate,
}: FilterControlsProps) {
  return (
    <div
      role='group'
      aria-label='Date posted'
      className='flex flex-wrap gap-1.5'
    >
      {POSTED_OPTIONS.filter((option) => option.value !== '24h').map(
        (option) => (
          <Button
            key={option.value}
            type='button'
            variant={
              (search.posted ?? '_any') === option.value ? 'secondary' : 'ghost'
            }
            size='sm'
            className='h-9 px-3 text-xs'
            aria-pressed={(search.posted ?? '_any') === option.value}
            onClick={() =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  posted:
                    option.value === '_any'
                      ? undefined
                      : (option.value as PublishedJobsFilters['posted']),
                  page: undefined,
                  linkedinPage: undefined,
                }),
                resetScroll: false,
              })
            }
          >
            {option.label}
          </Button>
        )
      )}
    </div>
  )
}

/** Shared URL-backed filter state (debounced search + location, immediate params). */
function usePublishedJobFilterState({ search, navigate }: FilterControlsProps) {
  const [localQ, setLocalQ] = useState(search.q ?? '')
  const [localLocation, setLocalLocation] = useState(search.location ?? '')

  const filtersActive = useMemo(
    () => hasActivePublishedJobFilters(search),
    [search]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL search to input
    setLocalQ(search.q ?? '')
  }, [search.q])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL location to input
    setLocalLocation(search.location ?? '')
  }, [search.location])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = localQ.trim() || undefined
      if (next !== search.q) {
        void navigate({
          search: (p) => ({
            ...p,
            q: next,
            page: undefined,
            linkedinPage: undefined,
          }),
          resetScroll: false,
        })
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [localQ, navigate, search.q])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = localLocation.trim() || undefined
      if (next !== search.location) {
        void navigate({
          search: (p) => ({
            ...p,
            location: next,
            page: undefined,
            linkedinPage: undefined,
          }),
          resetScroll: false,
        })
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [localLocation, navigate, search.location])

  const setParam = (
    key: keyof PublishedJobsFilters,
    value: string | undefined
  ) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        [key]: value || undefined,
        page: undefined,
        linkedinPage: undefined,
      }),
      resetScroll: false,
    })
  }

  const resetFilters = () => {
    void navigate({
      search: (prev) => clearPublishedJobSearchPreserveSetup(prev),
      resetScroll: false,
    })
  }

  return {
    localQ,
    setLocalQ,
    localLocation,
    setLocalLocation,
    filtersActive,
    setParam,
    resetFilters,
  }
}

/** The actual filter inputs, laid out as a row (`horizontal`) or stack (`vertical`). */
function PublishedJobsFilterControls({
  search,
  navigate,
  orientation,
  showReset = true,
  showSearch = true,
}: FilterControlsProps & {
  orientation: FilterOrientation
  showReset?: boolean
  showSearch?: boolean
}) {
  const {
    localQ,
    setLocalQ,
    localLocation,
    setLocalLocation,
    filtersActive,
    setParam,
    resetFilters,
  } = usePublishedJobFilterState({ search, navigate })

  const vertical = orientation === 'vertical'

  return (
    <div
      className={cn(
        vertical
          ? 'flex w-full min-w-0 flex-col gap-4'
          : 'flex w-full max-w-full min-w-0 flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0'
      )}
    >
      {showSearch && (
        <div
          className={cn(
            'relative',
            vertical
              ? 'w-full'
              : 'max-w-[min(100%,20rem)] min-w-[12rem] shrink-0 sm:max-w-none sm:min-w-0 sm:flex-1'
          )}
        >
          <label htmlFor='published-jobs-q' className='sr-only'>
            Search by title or company
          </label>
          <Search
            className='pointer-events-none absolute top-1/2 left-2.5 z-[1] size-3.5 -translate-y-1/2 text-muted-foreground'
            aria-hidden
          />
          <Input
            id='published-jobs-q'
            placeholder='Search title or company…'
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className={cn(
              'h-11 border-border/80 bg-background/90 pl-8 text-sm shadow-none sm:h-9',
              'transition-[box-shadow,background-color,border-color] duration-200',
              'focus-visible:bg-background focus-visible:shadow-sm'
            )}
          />
        </div>
      )}

      <FilterSelect
        label='Role'
        value={search.role}
        onChange={(v) => setParam('role', v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : 'min-w-[7.5rem] w-[7.5rem] sm:min-w-[8.25rem] sm:w-[8.25rem]'
        }
        options={ROLE_OPTIONS}
      />
      <FilterSelect
        label='Experience'
        value={search.experience}
        onChange={(v) => setParam('experience', v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : 'min-w-[6.5rem] w-[6.5rem] sm:min-w-[7rem] sm:w-[7rem]'
        }
        options={EXPERIENCE_OPTIONS}
      />
      <FilterSelect
        label='Work mode'
        value={search.work}
        onChange={(v) => setParam('work', v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : 'min-w-[6.75rem] w-[6.75rem] sm:min-w-[7.25rem] sm:w-[7.25rem]'
        }
        options={WORK_OPTIONS}
      />
      <FilterSelect
        label='Employment'
        value={search.type}
        onChange={(v) => setParam('type', v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : 'min-w-[7rem] w-[7rem] sm:min-w-[7.5rem] sm:w-[7.5rem]'
        }
        options={EMPLOYMENT_OPTIONS}
      />
      <FilterSelect
        label='Module'
        value={search.module}
        onChange={(v) => setParam('module', v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : 'min-w-[6.5rem] w-[6.5rem] sm:min-w-[7rem] sm:w-[7rem]'
        }
        options={MODULE_OPTIONS}
      />
      <FilterSelect
        label='Date posted'
        value={search.posted}
        onChange={(v) => setParam('posted', v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : 'min-w-[7.5rem] w-[7.5rem] sm:min-w-[8rem] sm:w-[8rem]'
        }
        options={POSTED_OPTIONS}
      />

      <div
        className={cn(
          'flex min-w-0 flex-col gap-1',
          vertical ? 'w-full' : 'shrink-0'
        )}
      >
        <label
          htmlFor='published-jobs-location'
          className='text-[10px] leading-none font-semibold tracking-[0.16em] text-muted-foreground uppercase'
        >
          Location
        </label>
        <div
          className={cn(
            'relative',
            vertical ? 'w-full' : 'w-[8.5rem] sm:w-[9.5rem]'
          )}
        >
          <MapPin
            className='pointer-events-none absolute top-1/2 left-2 z-[1] size-3 -translate-y-1/2 text-muted-foreground/80'
            aria-hidden
          />
          <Input
            id='published-jobs-location'
            placeholder='City / region'
            value={localLocation}
            onChange={(e) => setLocalLocation(e.target.value)}
            className='h-11 border-border/80 bg-background/90 pl-7 text-sm shadow-none transition-[background-color,border-color] duration-200 focus-visible:bg-background sm:h-9'
          />
        </div>
      </div>

      {showReset && filtersActive && (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'gap-1.5 text-xs text-muted-foreground hover:text-foreground',
            vertical
              ? 'mt-1 h-9 w-full justify-center'
              : 'mb-0.5 h-11 shrink-0 px-2 sm:h-8'
          )}
          onClick={resetFilters}
        >
          <SlidersHorizontal className='size-3.5' aria-hidden />
          <span className={vertical ? undefined : 'hidden sm:inline'}>
            Reset
          </span>
        </Button>
      )}
    </div>
  )
}

/** URL-backed filters for published jobs, horizontal sticky bar (legacy layout). */
export function PublishedJobsFiltersBar(props: FilterControlsProps) {
  return (
    <section
      aria-labelledby='job-filters-heading'
      className={cn(
        'sticky z-40 -mx-4 w-full max-w-full min-w-0 overflow-x-clip bg-background/95 px-4 py-2 backdrop-blur',
        'supports-[backdrop-filter]:bg-background/85',
        STICKY_BELOW_HEADER
      )}
    >
      <h3 id='job-filters-heading' className='sr-only'>
        Find your next role — search and filters
      </h3>
      <PublishedJobsFilterControls {...props} orientation='horizontal' />
    </section>
  )
}

/** Count of active detailed (non-search) filters. */
export function countActiveDetailedFilters(
  s: PublishedJobsSearchState
): number {
  return DETAILED_FILTER_DEFS.reduce((n, def) => {
    const value = s[def.key]
    return n + (typeof value === 'string' && value.trim() ? 1 : 0)
  }, 0)
}

function clearFilterParam(
  navigate: PublishedJobsNavigate,
  key: keyof PublishedJobsFilters
) {
  void navigate({
    search: (prev) => ({
      ...prev,
      [key]: undefined,
      page: undefined,
      linkedinPage: undefined,
    }),
    resetScroll: false,
  })
}

/** Compact trigger with a scrollable mobile sheet or desktop popover. */
export function PublishedJobsFiltersButton({
  search,
  navigate,
}: FilterControlsProps) {
  const isMobile = useIsMobile()
  const count = countActiveDetailedFilters(search)
  if (isMobile) {
    return (
      <PublishedJobsFiltersDrawer search={search} navigate={navigate} compact />
    )
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 gap-1.5'
        >
          <SlidersHorizontal className='size-3.5' aria-hidden />
          Filters
          {count > 0 && (
            <span className='ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums'>
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        collisionPadding={8}
        className='max-h-[min(70dvh,var(--radix-popover-content-available-height))] w-72 overflow-y-auto overscroll-contain'
      >
        <PublishedJobsFilterControls
          search={search}
          navigate={navigate}
          orientation='vertical'
          showSearch={false}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Removable chips for active detailed filters, with a "Clear all" action. */
export function PublishedJobsActiveFilters({
  search,
  navigate,
}: FilterControlsProps) {
  const chips = DETAILED_FILTER_DEFS.flatMap((def) => {
    const value = search[def.key]
    if (typeof value !== 'string' || !value.trim()) return []
    const label = def.options
      ? (def.options.find((o) => o.value === value)?.label ?? value)
      : value
    return [{ key: def.key, label }]
  })

  if (chips.length === 0) return null

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type='button'
          aria-label={`Remove ${chip.label} filter`}
          onClick={() => clearFilterParam(navigate, chip.key)}
          className='group inline-flex h-7 items-center gap-1 rounded-md bg-muted px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
        >
          <span>{chip.label}</span>
          <X
            className='size-3 text-muted-foreground group-hover:text-foreground'
            aria-hidden
          />
        </button>
      ))}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
        onClick={() =>
          void navigate({
            search: (prev) => clearPublishedJobSearchPreserveSetup(prev),
            resetScroll: false,
          })
        }
      >
        Clear all
      </Button>
    </div>
  )
}

/** Vertical filter panel for a desktop sidebar. */
export function PublishedJobsFiltersSidebar(props: FilterControlsProps) {
  const filtersActive = hasActivePublishedJobFilters(props.search)
  return (
    <section
      aria-labelledby='job-filters-heading'
      className='rounded-xl border border-border bg-card/40 p-4'
    >
      <div className='mb-4 flex items-center justify-between gap-2'>
        <h3
          id='job-filters-heading'
          className='text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase'
        >
          Filters
        </h3>
        {filtersActive && (
          <Button
            type='button'
            variant='link'
            size='sm'
            className='h-auto p-0 text-xs text-muted-foreground hover:text-foreground'
            onClick={() =>
              void props.navigate({
                search: (prev) => clearPublishedJobSearchPreserveSetup(prev),
                resetScroll: false,
              })
            }
          >
            Reset
          </Button>
        )}
      </div>
      <PublishedJobsFilterControls
        {...props}
        orientation='vertical'
        showReset={false}
      />
    </section>
  )
}

/** Mobile "Filters" trigger that opens the vertical controls in a slide-in sheet. */
export function PublishedJobsFiltersDrawer(
  props: FilterControlsProps & { compact?: boolean }
) {
  const filtersActive = hasActivePublishedJobFilters(props.search)
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className={cn(
            'justify-center gap-2',
            props.compact ? 'h-8 w-auto px-3 text-xs' : 'h-11 w-full sm:w-auto'
          )}
        >
          <SlidersHorizontal className='size-4' aria-hidden />
          Filters
          {filtersActive && (
            <span
              className='ml-1 inline-flex size-2 rounded-full bg-primary'
              aria-hidden
            />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side='left' className='w-[min(90vw,22rem)]'>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Refine the roles you see.</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-6'>
          <PublishedJobsFilterControls {...props} orientation='vertical' />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function FilterSelect(props: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  options: { value: string; label: string }[]
  triggerClass?: string
  fullWidth?: boolean
}) {
  const val = props.value ?? '_any'
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        props.fullWidth ? 'w-full' : 'shrink-0'
      )}
    >
      <label className='text-[10px] leading-none font-semibold tracking-[0.16em] text-muted-foreground uppercase'>
        {props.label}
      </label>
      <Select
        value={val}
        onValueChange={(v) => props.onChange(v === '_any' ? undefined : v)}
      >
        <SelectTrigger
          aria-label={props.label}
          className={cn(
            'h-11 border-border/80 bg-background/90 text-sm shadow-none transition-[background-color,border-color,box-shadow] duration-200 sm:h-9',
            'hover:bg-muted/40 focus-visible:bg-background data-[state=open]:bg-background',
            props.fullWidth && 'w-full',
            props.triggerClass
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          align='start'
          className='min-w-[var(--radix-select-trigger-width)]'
        >
          {props.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
