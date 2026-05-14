import type { ProfileRow, UserRole } from '@/lib/supabase/database.types'

export type ProfileUrlFilters = {
  email?: string
  role?: UserRole[]
}

/** Client-side filter for admin profiles table (URL-driven filters). */
export function filterProfilesForUrlState (
  rows: ProfileRow[],
  filters: ProfileUrlFilters
): ProfileRow[] {
  let out = rows
  const q = filters.email?.trim().toLowerCase()
  if (q) {
    out = out.filter((r) => r.email.toLowerCase().includes(q))
  }
  if (filters.role && filters.role.length > 0) {
    const set = new Set(filters.role)
    out = out.filter((r) => set.has(r.role))
  }
  return out
}

/** Predicate for route guard tests — admin-only surfaces. */
export function isAdminRole (role: string | null | undefined): boolean {
  return role === 'admin'
}
