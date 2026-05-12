import { MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

/** Narrow enough for both `/` (merged with `setup`) and `/jobs/` search. */
export type PublishedJobsSearchState = PublishedJobsFilters & { setup?: string }

export type PublishedJobsNavigate = (opts: {
  search:
    | true
    | ((
        prev: PublishedJobsSearchState
      ) => PublishedJobsSearchState)
}) => void | Promise<void>

export function hasActivePublishedJobFilters (s: PublishedJobsSearchState): boolean {
  return Boolean(
    s.q?.trim() ||
      s.role ||
      s.experience ||
      s.work ||
      s.type ||
      s.location?.trim()
  )
}

export function clearPublishedJobSearchPreserveSetup (
  prev: PublishedJobsSearchState
): PublishedJobsSearchState {
  const next: PublishedJobsSearchState = {}
  if (prev.setup !== undefined && prev.setup !== '') {
    next.setup = prev.setup
  }
  return next
}

/** URL-backed filters for published jobs (home + `/jobs` index). */
export function PublishedJobsFiltersBar (props: {
  search: PublishedJobsSearchState
  navigate: PublishedJobsNavigate
}) {
  const { search, navigate } = props
  const [localQ, setLocalQ] = useState(search.q ?? '')

  const filtersActive = useMemo(() => hasActivePublishedJobFilters(search), [search])

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

  const setParam = (key: keyof PublishedJobsFilters, value: string | undefined) => {
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
      className='relative overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]'
    >
      <div
        className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-muted/50 dark:from-primary/[0.08] dark:to-muted/20'
        aria-hidden
      />
      <div className='relative min-w-0 space-y-5 p-4 sm:p-5 md:p-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='flex items-center gap-2'>
                <SlidersHorizontal
                  className='size-4 text-primary/80'
                  aria-hidden
                />
                <h3
                  id='job-filters-heading'
                  className='text-sm font-semibold tracking-tight text-foreground'
                >
                  Find your next role
                </h3>
              </div>
              <p className='max-w-md text-xs leading-relaxed text-muted-foreground'>
                Tune keywords and constraints — the list updates as you go. Share
                the URL to save a search.
              </p>
            </div>
            {filtersActive && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='shrink-0 text-muted-foreground hover:text-foreground'
                onClick={resetFilters}
              >
                Reset filters
              </Button>
            )}
          </div>

          <div className='relative'>
            <label htmlFor='published-jobs-q' className='sr-only'>
              Search by title or company
            </label>
            <Search
              className='pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2 text-muted-foreground'
              aria-hidden
            />
            <Input
              id='published-jobs-q'
              placeholder='Search title or company…'
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              className={cn(
                'h-11 border-border/80 bg-background/80 pl-10 text-base shadow-none sm:h-10 sm:text-sm',
                'transition-[box-shadow,background-color,border-color] duration-200',
                'focus-visible:bg-background focus-visible:shadow-sm'
              )}
            />
          </div>

          <div
            className='h-px w-full bg-gradient-to-r from-transparent via-border to-transparent'
            role='presentation'
          />

          <div>
            <p className='mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
              Refine
            </p>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5'>
              <FilterSelect
                label='Role'
                value={search.role}
                onChange={(v) => setParam('role', v)}
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
                options={[
                  { value: '_any', label: 'Any' },
                  { value: 'full_time', label: 'Full-time' },
                  { value: 'part_time', label: 'Part-time' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'freelance', label: 'Freelance' },
                ]}
              />
              <div className='grid gap-2'>
                <label
                  htmlFor='published-jobs-location'
                  className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
                >
                  Location
                </label>
                <div className='relative'>
                  <MapPin
                    className='pointer-events-none absolute left-2.5 top-1/2 z-[1] size-3.5 -translate-y-1/2 text-muted-foreground/80'
                    aria-hidden
                  />
                  <Input
                    id='published-jobs-location'
                    placeholder='City or region'
                    value={search.location ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      void navigate({ search: (p) => ({ ...p, location: v || undefined }) })
                    }}
                    className='h-9 border-border/80 bg-background/60 pl-8 text-sm shadow-none transition-[background-color,border-color] duration-200 focus-visible:bg-background'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
    </section>
  )
}

function FilterSelect (props: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  options: { value: string; label: string }[]
}) {
  const val = props.value ?? '_any'
  return (
    <div className='grid min-w-0 gap-2'>
      <label className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
        {props.label}
      </label>
      <Select
        value={val}
        onValueChange={(v) => props.onChange(v === '_any' ? undefined : v)}
      >
        <SelectTrigger
          className={cn(
            'h-9 w-full border-border/80 bg-background/60 text-sm shadow-none transition-[background-color,border-color,box-shadow] duration-200',
            'hover:bg-muted/40 focus-visible:bg-background data-[state=open]:bg-background'
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align='start' className='min-w-[var(--radix-select-trigger-width)]'>
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
