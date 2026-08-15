const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function safeResumeStoragePath(
  value: string | null | undefined,
  candidateUserId: string
): string | null {
  const path = value?.trim() ?? ''
  if (!UUID_RE.test(candidateUserId)) return null
  const escapedUser = candidateUserId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escapedUser}/resume\\.(pdf|doc|docx)$`, 'i').test(path)
    ? path
    : null
}
