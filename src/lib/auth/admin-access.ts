/** Comma-separated staff emails (lowercased, trimmed). */
export function parseAdminAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Client route guards read `VITE_ADMIN_EMAIL_ALLOWLIST` (see `.env.example`). */
export function getAdminAllowlistFromEnv(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAIL_ALLOWLIST as string | undefined
  return parseAdminAllowlist(raw)
}

export function isAllowlistedAdminEmail(
  email: string,
  allowlist: string[] = getAdminAllowlistFromEnv()
): boolean {
  const normalized = email.trim().toLowerCase()
  if (!normalized || allowlist.length === 0) return false
  return allowlist.includes(normalized)
}
