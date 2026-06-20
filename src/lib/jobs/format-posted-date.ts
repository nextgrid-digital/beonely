/** Compact "Mon D, YYYY" label for a job's `created_at` timestamp. */
export function formatPostedDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
