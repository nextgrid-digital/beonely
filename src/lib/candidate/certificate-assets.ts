import type { ResumeStructuredV1 } from '@/lib/candidate/resume-structured-schema'
import { getSupabaseUrl } from '@/lib/supabase/client'

const UUID_SOURCE =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const CERTIFICATE_PATH_RE = new RegExp(
  `^(${UUID_SOURCE})/(${UUID_SOURCE})\\.(jpg|png|webp|pdf)$`,
  'i'
)

export function safeCandidateCertificatePath(
  value: string | null | undefined,
  expectedUserId?: string
): string | null {
  const trimmed = value?.trim() ?? ''
  const match = CERTIFICATE_PATH_RE.exec(trimmed)
  if (!match) return null
  if (
    expectedUserId &&
    match[1]?.toLowerCase() !== expectedUserId.toLowerCase()
  ) {
    return null
  }
  return trimmed
}

/** Read a legacy public certificate URL without ever treating it as a link. */
export function certificatePathFromLegacyPublicUrl(
  value: string | null | undefined,
  expectedUserId: string
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const project = new URL(getSupabaseUrl())
    const url = new URL(trimmed)
    const prefix = '/storage/v1/object/public/certificates/'
    if (url.protocol !== 'https:' || url.origin !== project.origin) return null
    if (!url.pathname.startsWith(prefix)) return null
    return safeCandidateCertificatePath(
      decodeURIComponent(url.pathname.slice(prefix.length)),
      expectedUserId
    )
  } catch {
    return null
  }
}

/** Only an app-owned, tokenized private Storage URL is safe to render. */
export function safeCandidateCertificateSignedUrl(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const project = new URL(getSupabaseUrl())
    const url = new URL(trimmed)
    const prefix = '/storage/v1/object/sign/certificates/'
    const path = decodeURIComponent(url.pathname.slice(prefix.length))
    if (
      url.protocol !== 'https:' ||
      url.origin !== project.origin ||
      !url.pathname.startsWith(prefix) ||
      !safeCandidateCertificatePath(path) ||
      !url.searchParams.get('token')
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

/** Store only owner-bound object paths; signed/public URLs are transient. */
export function prepareCertificateAssetsForStorage(
  draft: ResumeStructuredV1,
  userId: string
): ResumeStructuredV1 {
  return {
    ...draft,
    sections: draft.sections.map((section) => {
      const certificateSection = section.title
        .trim()
        .toLowerCase()
        .includes('certificat')
      return {
        ...section,
        items: section.items.map((item) => {
          const path = certificateSection
            ? (safeCandidateCertificatePath(item.filePath, userId) ??
              certificatePathFromLegacyPublicUrl(item.fileUrl, userId))
            : null
          return {
            ...item,
            filePath: path ?? '',
            fileUrl: '',
          }
        }),
      }
    }),
  }
}
