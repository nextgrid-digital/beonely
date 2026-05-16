import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search, SlidersHorizontal } from 'lucide-react'
import type { PublishedJobsFilters } from '@/lib/jobs/fetch-published-jobs'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Narrow enough for `/` (merged with `setup`) and legacy `/jobs/` redirect (same filter shape). */
export type PublishedJobsSearchState = PublishedJobsFilters & { setup?: string }

export type PublishedJobsNavigate = (opts: {
  search: true | ((prev: PublishedJobsSearchState) => PublishedJobsSearchState)
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

/** URL-backed filters for published jobs (home; `/jobs/` redirects to `/` with same params). */
export function PublishedJobsFiltersBar(props: {
  search: PublishedJobsSearchState
  navigate: PublishedJobsNavigate
}) {
  const { search, navigate } = props
  const [localQ, setLocalQ] = useState(search.q ?? '')

  const filtersActive = useMemo(
    () => hasActivePublishedJobFilters(search),
    [search]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL search to input
    setLocalQ(search.q ?? '')
  }, [search.q])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = localQ.trim() || undefined
      if (next !== search.q) {
        void navigate({ search: (p) => ({ ...p, q: next }) })
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [localQ, navigate, search.q])

  const setParam = (
    key: keyof PublishedJobsFilters,
    value: string | undefined
  ) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        [key]: value || undefined,
      }),
    })
  }

  const resetFilters = () => {
    void navigate({
      search: (prev) => clearPublishedJobSearchPreserveSetup(prev),
    })
  }

  return (
    <section
      aria-labelledby='job-filters-heading'
      className={cn(
        'sticky z-40 -mx-4 bg-background/95 px-4 py-2 backdrop-blur',
        'supports-[backdrop-filter]:bg-background/85',
        STICKY_BELOW_HEADER
      )}
    >
      <h3 id='job-filters-heading' className='sr-only'>
        Find your next role — search and filters
      </h3>

      <div className='flex min-w-0 flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0'>
        <div className='relative max-w-[min(100%,20rem)] min-w-[12rem] shrink-0 sm:max-w-none sm:min-w-0 sm:flex-1'>
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

        <FilterSelect
          label='Role'
          value={search.role}
          onChange={(v) => setParam('role', v)}
          triggerClass='min-w-[7.5rem] w-[7.5rem] sm:min-w-[8.25rem] sm:w-[8.25rem]'
          options={[
            { value: '_any', label: 'Any role' },
            { value: 'developer', label: 'Developer' },
            { value: 'architect', label: 'Architect' },
            { value: 'consultant', label: 'Consultant' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
        <FilterSelect
          label='Experience'
          value={search.experience}
          onChange={(v) => setParam('experience', v)}
          triggerClass='min-w-[6.5rem] w-[6.5rem] sm:min-w-[7rem] sm:w-[7rem]'
          options={[
            { value: '_any', label: 'Any' },
            { value: 'junior', label: 'Junior' },
            { value: 'mid', label: 'Mid' },
            { value: 'senior', label: 'Senior' },
            { value: 'lead', label: 'Lead' },
          ]}
        />
        <FilterSelect
          label='Work mode'
          value={search.work}
          onChange={(v) => setParam('work', v)}
          triggerClass='min-w-[6.75rem] w-[6.75rem] sm:min-w-[7.25rem] sm:w-[7.25rem]'
          options={[
            { value: '_any', label: 'Any' },
            { value: 'remote', label: 'Remote' },
            { value: 'hybrid', label: 'Hybrid' },
            { value: 'onsite', label: 'Onsite' },
          ]}
        />
        <FilterSelect
          label='Employment'
          value={search.type}
          onChange={(v) => setParam('type', v)}
          triggerClass='min-w-[7rem] w-[7rem] sm:min-w-[7.5rem] sm:w-[7.5rem]'
          options={[
            { value: '_any', label: 'Any' },
            { value: 'full_time', label: 'Full-time' },
            { value: 'part_time', label: 'Part-time' },
            { value: 'contract', label: 'Contract' },
            { value: 'freelance', label: 'Freelance' },
          ]}
        />

        <div className='flex min-w-0 shrink-0 flex-col gap-1'>
          <label
            htmlFor='published-jobs-location'
            className='text-[10px] leading-none font-semibold tracking-[0.16em] text-muted-foreground uppercase'
          >
            Location
          </label>
          <div className='relative w-[8.5rem] sm:w-[9.5rem]'>
            <MapPin
              className='pointer-events-none absolute top-1/2 left-2 z-[1] size-3 -translate-y-1/2 text-muted-foreground/80'
              aria-hidden
            />
            <Input
              id='published-jobs-location'
              placeholder='City / region'
              value={search.location ?? ''}
              onChange={(e) => {
                const v = e.target.value
                void navigate({
                  search: (p) => ({ ...p, location: v || undefined }),
                })
              }}
              className='h-11 border-border/80 bg-background/90 pl-7 text-sm shadow-none transition-[background-color,border-color] duration-200 focus-visible:bg-background sm:h-9'
            />
          </div>
        </div>

        {filtersActive && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='mb-0.5 h-11 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground sm:h-8'
            onClick={resetFilters}
          >
            <SlidersHorizontal className='size-3.5' aria-hidden />
            <span className='hidden sm:inline'>Reset</span>
          </Button>
        )}
      </div>
    </section>
  )
}

function FilterSelect(props: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  options: { value: string; label: string }[]
  triggerClass?: string
}) {
  const val = props.value ?? '_any'
  return (
    <div className='flex shrink-0 flex-col gap-1'>
      <label className='text-[10px] leading-none font-semibold tracking-[0.16em] text-muted-foreground uppercase'>
        {props.label}
      </label>
      <Select
        value={val}
        onValueChange={(v) => props.onChange(v === '_any' ? undefined : v)}
      >
        <SelectTrigger
          className={cn(
            'h-11 border-border/80 bg-background/90 text-sm shadow-none transition-[background-color,border-color,box-shadow] duration-200 sm:h-9',
            'hover:bg-muted/40 focus-visible:bg-background data-[state=open]:bg-background',
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
