/** Routes that use the public marketing shell; sign-out should not send users to full-page sign-in. */
export function isPublicMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true
  if (pathname.startsWith('/jobs/')) return true
  return false
}
