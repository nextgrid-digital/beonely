/** Server-side staff allowlist (mirrors src/lib/auth/admin-access.ts). */
export function parseAdminAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function getAdminAllowlistFromServerEnv(): string[] {
  return parseAdminAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST)
}

export function isAllowlistedAdminEmail(
  email: string,
  allowlist: string[] = getAdminAllowlistFromServerEnv()
): boolean {
  const normalized = email.trim().toLowerCase()
  if (!normalized || allowlist.length === 0) return false
  return allowlist.includes(normalized)
}
