/**
 * Compact trailing timestamp for inbox-style list rows: shows the time for
 * items from today (e.g. "9:23 PM") and an abbreviated month/day otherwise
 * (e.g. "Jun 5"). Older items in prior years include the year.
 */
export function formatListTimestamp(value: string | Date): string {
  const date = new Date(value)
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfEvent = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfEvent.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  }).format(date)
}
