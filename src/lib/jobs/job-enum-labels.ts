/** Human-friendly labels for job enum values (employment type, work mode, role, etc.). */
const EXPLICIT_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
  temporary: 'Temporary',
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
  on_site: 'On-site',
}

/** Convert a snake_case enum value into a proper, underscore-free label. */
export function formatJobEnumLabel(value: string | null | undefined): string {
  if (!value) return ''
  const key = value.trim().toLowerCase()
  if (EXPLICIT_LABELS[key]) return EXPLICIT_LABELS[key]
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
