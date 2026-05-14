/** Normalized recruiter app path (trailing slash on index only). */
export function normalizeRecruiterPathname(pathname: string): string {
  if (pathname === '/recruiter') return '/recruiter/'
  return pathname
}

export type RecruiterSubnavActiveKey = 'my-jobs' | 'pricing'

/** Which primary recruiter nav item is active for the current URL. */
export function recruiterSubnavActiveKey(
  pathname: string
): RecruiterSubnavActiveKey {
  const p = pathname.replace(/\/$/, '') || '/'
  if (p === '/recruiter/pricing') return 'pricing'
  return 'my-jobs'
}

export type RecruiterBreadcrumbSegment = { label: string; to?: string }

/** Breadcrumb trail for recruiter shell (no job title fetch — keeps module pure). */
export function recruiterBreadcrumbSegments(
  pathname: string
): RecruiterBreadcrumbSegment[] {
  const p = pathname.replace(/\/$/, '') || '/'
  if (p === '/recruiter/jobs/new') {
    return [
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'My jobs', to: '/recruiter' },
      { label: 'New listing' },
    ]
  }
  if (p.startsWith('/recruiter/jobs/') && p.endsWith('/edit')) {
    return [
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'My jobs', to: '/recruiter' },
      { label: 'Edit listing' },
    ]
  }
  if (p.startsWith('/recruiter/jobs/') && p.endsWith('/applicants')) {
    return [
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'My jobs', to: '/recruiter' },
      { label: 'Applicants' },
    ]
  }
  if (p === '/recruiter/pricing') {
    return [
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'Pricing' },
    ]
  }
  return [{ label: 'Recruiter', to: '/recruiter' }, { label: 'My jobs' }]
}
