import {
  parseResumeStructured,
  PROFILE_AVATAR_PLACEHOLDER_URL,
  type ResumeStructuredV1,
} from '@/lib/candidate/resume-structured-schema'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'

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

function usableAvatar(url: string): string | null {
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) return null
  if (u.includes('placehold.co')) return null
  return u
}

/**
 * Fetch a published candidate portfolio via the `get_public_portfolio` RPC.
 * The RPC strips email/phone server-side and only returns published profiles.
 * Returns null when the handle is unknown, unpublished, or Supabase is unset.
 */
export async function fetchPublicPortfolio(
  slug: string
): Promise<PublicPortfolioData | null> {
  if (!getSupabaseConfigured()) return null
  const sb = getSupabaseBrowserClient()
  const { data, error } = await sb.rpc('get_public_portfolio', { p_slug: slug })
  if (error) throw error
  if (data == null || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>
  const resume = parseResumeStructured(obj.resume)
  const name = asString(obj.name).trim() || resume.general.name.trim() || 'Candidate'
  const avatar = usableAvatar(asString(obj.avatar) || resume.general.avatar)

  return {
    slug: asString(obj.slug).trim() || slug,
    name,
    headline: asString(obj.headline).trim() || resume.general.jobTitle.trim(),
    avatar,
    about: asString(obj.about).trim() || resume.general.about.trim(),
    resume:
      avatar == null
        ? {
            ...resume,
            general: {
              ...resume.general,
              avatar: PROFILE_AVATAR_PLACEHOLDER_URL,
            },
          }
        : resume,
  }
}
