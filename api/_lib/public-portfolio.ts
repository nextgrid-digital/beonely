import { tryGetServiceSupabase } from './supabase.js'

/** A contact row as stored in `resume_structured.general.contacts`. */
export type PublicContact = {
  label: string
  value: string
  href: string
}

/** Sanitized resume envelope safe to expose publicly (email/phone removed). */
export type PublicResume = {
  schemaVersion: 1
  general: {
    name: string
    avatar: string
    jobTitle: string
    location: string
    website: string
    about: string
    contacts: PublicContact[]
  }
  sections: Array<{
    title: string
    items: Array<Record<string, unknown>>
  }>
}

export type PublicPortfolio = {
  slug: string
  /** Display name (profile `full_name` falls back to the resume name). */
  name: string
  headline: string
  avatar: string | null
  about: string
  /** Sanitized resume for rendering (no email/phone contacts). */
  resume: PublicResume
}

function asString (value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function isUsableAvatar (url: string): boolean {
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) return false
  // Placeholder set in the schema default; treat as "no avatar".
  if (u.includes('placehold.co')) return false
  return true
}

function toContacts (raw: unknown): PublicContact[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((c): c is Record<string, unknown> => c != null && typeof c === 'object')
    .map((c) => ({
      label: asString(c.label),
      value: asString(c.value),
      href: asString(c.href),
    }))
}

function toSections (raw: unknown): PublicResume['sections'] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is Record<string, unknown> => s != null && typeof s === 'object')
    .map((s) => ({
      title: asString(s.title),
      items: Array.isArray(s.items)
        ? (s.items.filter(
            (i) => i != null && typeof i === 'object'
          ) as Array<Record<string, unknown>>)
        : [],
    }))
}

/** Map the `get_public_portfolio` RPC JSON payload into a typed portfolio. */
export function mapPortfolioPayload (payload: unknown): PublicPortfolio | null {
  if (payload == null || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  const resumeObj =
    obj.resume != null && typeof obj.resume === 'object'
      ? (obj.resume as Record<string, unknown>)
      : {}
  const generalObj =
    resumeObj.general != null && typeof resumeObj.general === 'object'
      ? (resumeObj.general as Record<string, unknown>)
      : {}

  const general: PublicResume['general'] = {
    name: asString(generalObj.name),
    avatar: asString(generalObj.avatar),
    jobTitle: asString(generalObj.jobTitle),
    location: asString(generalObj.location),
    website: asString(generalObj.website),
    about: asString(generalObj.about),
    contacts: toContacts(generalObj.contacts),
  }

  const resume: PublicResume = {
    schemaVersion: 1,
    general,
    sections: toSections(resumeObj.sections),
  }

  const name = asString(obj.name).trim() || general.name.trim() || 'Candidate'
  const avatarRaw = asString(obj.avatar) || general.avatar

  return {
    slug: asString(obj.slug),
    name,
    headline: asString(obj.headline).trim() || general.jobTitle.trim(),
    avatar: isUsableAvatar(avatarRaw) ? avatarRaw : null,
    about: asString(obj.about).trim() || general.about.trim(),
    resume,
  }
}

export async function fetchPublicPortfolioBySlug (
  slug: string
): Promise<PublicPortfolio | null> {
  const supInit = tryGetServiceSupabase()
  if (!supInit.ok) return null

  const { data, error } = await supInit.client.rpc('get_public_portfolio', {
    p_slug: slug,
  })

  if (error || data == null) return null
  return mapPortfolioPayload(data)
}
