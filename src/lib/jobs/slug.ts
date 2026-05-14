/** URL-safe slug from title + location + short id suffix for uniqueness */
export function buildJobSlugBase(title: string, location: string): string {
  const raw = `${title}-${location}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return raw || 'job'
}

export function buildJobSlug(
  title: string,
  location: string,
  idSuffix: string
) {
  const base = buildJobSlugBase(title, location)
  const suffix = idSuffix.replace(/-/g, '').slice(0, 8)
  return `${base}-${suffix}`
}
