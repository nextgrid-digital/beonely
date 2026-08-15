import {
  safeCandidateCertificatePath,
  safeCandidateCertificateSignedUrl,
} from '@/lib/candidate/certificate-assets'
import { isValidHandle } from '@/lib/candidate/portfolio-slug'
import {
  parseResumeStructured,
  PROFILE_AVATAR_PLACEHOLDER_URL,
  type ResumeStructuredV1,
} from '@/lib/candidate/resume-structured-schema'
import { safeHttpsUrl } from '@/lib/security/safe-url'
import { getSupabaseUrl } from '@/lib/supabase/client'

export type PublicPortfolioData = {
  slug: string
  name: string
  headline: string
  avatar: string | null
  about: string
  resume: ResumeStructuredV1
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function safePublicAvatarUrl(value: string): string | null {
  try {
    const project = new URL(getSupabaseUrl())
    const trimmed = value.trim()
    const avatar = trimmed.startsWith('/')
      ? new URL(trimmed, project.origin)
      : new URL(trimmed)
    const parts = avatar.pathname.split('/').filter(Boolean)
    if (
      project.protocol !== 'https:' ||
      avatar.protocol !== 'https:' ||
      avatar.origin !== project.origin ||
      parts.length !== 7 ||
      parts[0] !== 'storage' ||
      parts[1] !== 'v1' ||
      parts[2] !== 'object' ||
      parts[3] !== 'public' ||
      parts[4] !== 'avatars' ||
      !UUID_RE.test(parts[5] ?? '') ||
      parts[6] !== 'avatar.jpg'
    ) {
      return null
    }
    return `${project.origin}${avatar.pathname}`
  } catch {
    return null
  }
}

/**
 * Fetch a published candidate portfolio via the `get_public_portfolio` RPC.
 * The RPC strips email/phone server-side and only returns published profiles.
 * Returns null when the handle is unknown, unpublished, or Supabase is unset.
 */
export async function fetchPublicPortfolio(
  slug: string
): Promise<PublicPortfolioData | null> {
  if (!isValidHandle(slug)) return null
  const response = await fetch(
    `/api/public-portfolio?slug=${encodeURIComponent(slug)}`,
    { cache: 'no-store', credentials: 'omit' }
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Could not load this portfolio.')
  const data = (await response.json()) as unknown
  if (data == null || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>
  const resume = parseResumeStructured(obj.resume)
  const name =
    asString(obj.name).trim() || resume.general.name.trim() || 'Candidate'
  const avatar = safePublicAvatarUrl(
    asString(obj.avatar) || resume.general.avatar
  )
  const safeResume: ResumeStructuredV1 = {
    ...resume,
    general: {
      ...resume.general,
      avatar: avatar ?? PROFILE_AVATAR_PLACEHOLDER_URL,
      website: safeHttpsUrl(resume.general.website) ?? '',
      contacts: resume.general.contacts
        .map((contact) => ({
          ...contact,
          href: safeHttpsUrl(contact.href) ?? '',
        }))
        .filter((contact) => Boolean(contact.href)),
    },
    sections: resume.sections.map((section) => {
      const certificateSection = /certificat/i.test(section.title)
      return {
        ...section,
        items: section.items.map((item) => ({
          ...item,
          filePath: certificateSection
            ? (safeCandidateCertificatePath(item.filePath) ?? '')
            : '',
          fileUrl: certificateSection
            ? (safeCandidateCertificateSignedUrl(item.fileUrl) ?? '')
            : '',
        })),
      }
    }),
  }

  return {
    slug: asString(obj.slug).trim() || slug,
    name,
    headline: asString(obj.headline).trim() || resume.general.jobTitle.trim(),
    avatar,
    about: asString(obj.about).trim() || resume.general.about.trim(),
    resume: safeResume,
  }
}
