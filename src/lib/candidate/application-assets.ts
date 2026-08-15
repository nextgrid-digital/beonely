import { getSupabaseUrl } from '@/lib/supabase/client'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function safeResumeStoragePath(
  value: string | null | undefined,
  candidateUserId: string
): string | null {
  const path = value?.trim() ?? ''
  if (!UUID_RE.test(candidateUserId)) return null
  return path.toLowerCase() === `${candidateUserId.toLowerCase()}/resume.pdf` ||
    path.toLowerCase() === `${candidateUserId.toLowerCase()}/resume.doc` ||
    path.toLowerCase() === `${candidateUserId.toLowerCase()}/resume.docx`
    ? path
    : null
}

export function safePrivateResumeSignedUrl(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const project = new URL(getSupabaseUrl())
    const url = new URL(trimmed)
    const prefix = '/storage/v1/object/sign/resumes/'
    if (
      url.protocol !== 'https:' ||
      url.origin !== project.origin ||
      !url.pathname.startsWith(prefix) ||
      !url.searchParams.get('token')
    ) {
      return null
    }
    const parts = decodeURIComponent(url.pathname.slice(prefix.length)).split(
      '/'
    )
    if (
      parts.length !== 2 ||
      !UUID_RE.test(parts[0] ?? '') ||
      !/^resume\.(pdf|doc|docx)$/i.test(parts[1] ?? '')
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}
