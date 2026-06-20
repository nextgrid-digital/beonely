/**
 * Generic "inbox"-style date grouping. Splits items into ordered buckets:
 * Today (no header label, Notion-style), "Last 7 days", "Last 30 days", then
 * one bucket per month (e.g. "June", or "March 2025" for prior years). Items
 * inside each group preserve their incoming order; callers should pre-sort
 * newest-first.
 */

export interface DateGroup<T> {
  id: string
  /** null = render with no section header (the Today bucket). */
  label: string | null
  items: T[]
}

type RelativeGroupId = 'today' | 'last_7_days' | 'last_30_days'

interface MonthBucket<T> {
  year: number
  month: number
  items: T[]
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function diffCalendarDays(value: string | Date, now: Date): number {
  const eventDay = startOfDay(new Date(value))
  const today = startOfDay(now)
  return Math.floor(
    (today.getTime() - eventDay.getTime()) / (1000 * 60 * 60 * 24)
  )
}

function formatMonthLabel(year: number, month: number, now: Date): string {
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
    new Date(year, month, 1)
  )
  if (year !== now.getFullYear()) {
    return `${monthName} ${year}`
  }
  return monthName
}

function monthKey(year: number, month: number): string {
  return `month:${year}-${month}`
}

export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined,
  now: Date = new Date()
): DateGroup<T>[] {
  const relativeBuckets: Record<RelativeGroupId, T[]> = {
    today: [],
    last_7_days: [],
    last_30_days: [],
  }
  const monthBuckets = new Map<string, MonthBucket<T>>()

  for (const item of items) {
    const date = getDate(item)
    if (!date) {
      // Items without a date fall into the oldest-relative bucket so they
      // remain visible rather than silently dropped.
      relativeBuckets.last_30_days.push(item)
      continue
    }

    const diffDays = diffCalendarDays(date, now)

    if (diffDays <= 0) {
      relativeBuckets.today.push(item)
      continue
    }
    if (diffDays <= 7) {
      relativeBuckets.last_7_days.push(item)
      continue
    }
    if (diffDays <= 30) {
      relativeBuckets.last_30_days.push(item)
      continue
    }

    const parsed = new Date(date)
    const year = parsed.getFullYear()
    const month = parsed.getMonth()
    const key = monthKey(year, month)
    const existing = monthBuckets.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      monthBuckets.set(key, { year, month, items: [item] })
    }
  }

  const groups: DateGroup<T>[] = []

  if (relativeBuckets.today.length > 0) {
    groups.push({ id: 'today', label: null, items: relativeBuckets.today })
  }
  if (relativeBuckets.last_7_days.length > 0) {
    groups.push({
      id: 'last_7_days',
      label: 'Last 7 days',
      items: relativeBuckets.last_7_days,
    })
  }
  if (relativeBuckets.last_30_days.length > 0) {
    groups.push({
      id: 'last_30_days',
      label: 'Last 30 days',
      items: relativeBuckets.last_30_days,
    })
  }

  const sortedMonths = [...monthBuckets.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  for (const bucket of sortedMonths) {
    groups.push({
      id: monthKey(bucket.year, bucket.month),
      label: formatMonthLabel(bucket.year, bucket.month, now),
      items: bucket.items,
    })
  }

  return groups
}
