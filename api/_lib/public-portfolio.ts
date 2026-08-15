import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidPortfolioSlug } from './public-slug.js'
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

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CERTIFICATE_PATH_RE = new RegExp(
  `^${UUID_RE.source.slice(1, -1)}/${UUID_RE.source.slice(1, -1)}\\.(jpg|png|webp|pdf)$`,
  'i'
)
const CERTIFICATE_URL_TTL_SECONDS = 5 * 60

function safeHttpsUrl(value: unknown): string {
  const text = asString(value).trim()
  if (!text || text.length > 2048) return ''
  try {
    const url = new URL(text)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !url.hostname
    )
      return ''
    return url.toString()
  } catch {
    return ''
  }
}

function safeCertificatePath(value: unknown): string {
  const path = asString(value).trim()
  return CERTIFICATE_PATH_RE.test(path) ? path : ''
}

/** Resolve only the app-owned avatar object path against the configured project. */
export function resolveSafePublicAvatarUrl(
  value: string,
  supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
): string | null {
  if (!supabaseUrl?.trim()) return null
  try {
    const project = new URL(supabaseUrl.trim())
    if (project.protocol !== 'https:') return null

    const trimmed = value.trim()
    const avatar = trimmed.startsWith('/')
      ? new URL(trimmed, project.origin)
      : new URL(trimmed)
    if (avatar.protocol !== 'https:' || avatar.origin !== project.origin) {
      return null
    }
    const parts = avatar.pathname.split('/').filter(Boolean)
    const valid =
      parts.length === 7 &&
      parts[0] === 'storage' &&
      parts[1] === 'v1' &&
      parts[2] === 'object' &&
      parts[3] === 'public' &&
      parts[4] === 'avatars' &&
      UUID_RE.test(parts[5] ?? '') &&
      parts[6] === 'avatar.jpg'
    return valid ? `${project.origin}${avatar.pathname}` : null
  } catch {
    return null
  }
}

/** Only allow the app-owned public avatar object path in the configured project. */
export function isSafePublicAvatarUrl(
  value: string,
  supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
): boolean {
  return resolveSafePublicAvatarUrl(value, supabaseUrl) !== null
}

function toContacts(raw: unknown): PublicContact[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (c): c is Record<string, unknown> => c != null && typeof c === 'object'
    )
    .map((c) => ({
      label: asString(c.label),
      value: asString(c.value),
      href: safeHttpsUrl(c.href),
    }))
    .filter((contact) =>
      Boolean(
        contact.href &&
        !contact.value.includes('@') &&
        !/(email|phone|mobile|whatsapp|contact)/i.test(contact.label)
      )
    )
}

function toSections(raw: unknown): PublicResume['sections'] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 30)
    .filter(
      (s): s is Record<string, unknown> => s != null && typeof s === 'object'
    )
    .map((s) => {
      const title = asString(s.title)
      const certificateSection = /certificat/i.test(title)
      const items = Array.isArray(s.items)
        ? (s.items
            .slice(0, 50)
            .filter((i) => i != null && typeof i === 'object') as Array<
            Record<string, unknown>
          >)
        : []
      return {
        title,
        items: items.map((item) => {
          const clean = { ...item }
          delete clean.fileUrl
          const path = certificateSection
            ? safeCertificatePath(clean.filePath)
            : ''
          clean.filePath = path
          return clean
        }),
      }
    })
}

async function signCertificateAssets(
  portfolio: PublicPortfolio,
  client: SupabaseClient
): Promise<void> {
  const paths = new Set<string>()
  for (const section of portfolio.resume.sections) {
    if (!/certificat/i.test(section.title)) continue
    for (const item of section.items) {
      const path = safeCertificatePath(item.filePath)
      if (path && paths.size < 20) paths.add(path)
    }
  }

  const signed = new Map<string, string>()
  await Promise.all(
    [...paths].map(async (path) => {
      const { data, error } = await client.storage
        .from('certificates')
        .createSignedUrl(path, CERTIFICATE_URL_TTL_SECONDS)
      if (!error && data?.signedUrl) signed.set(path, data.signedUrl)
    })
  )

  for (const section of portfolio.resume.sections) {
    for (const item of section.items) {
      const path = safeCertificatePath(item.filePath)
      item.fileUrl = path ? (signed.get(path) ?? '') : ''
    }
  }
}

/** Map the `get_public_portfolio` RPC JSON payload into a typed portfolio. */
export function mapPortfolioPayload(payload: unknown): PublicPortfolio | null {
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
    website: safeHttpsUrl(generalObj.website),
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
  const safeAvatar = resolveSafePublicAvatarUrl(avatarRaw)
  general.avatar = safeAvatar ?? ''

  return {
    slug: asString(obj.slug),
    name,
    headline: asString(obj.headline).trim() || general.jobTitle.trim(),
    avatar: safeAvatar,
    about: asString(obj.about).trim() || general.about.trim(),
    resume,
  }
}

export async function fetchPublicPortfolioBySlug(
  slug: string
): Promise<PublicPortfolio | null> {
  if (!isValidPortfolioSlug(slug)) return null
  const supInit = tryGetServiceSupabase()
  if (!supInit.ok) return null

  const { data, error } = await supInit.client.rpc('get_public_portfolio', {
    p_slug: slug,
  })

  if (error || data == null) return null
  const portfolio = mapPortfolioPayload(data)
  if (!portfolio) return null
  await signCertificateAssets(portfolio, supInit.client)
  return portfolio
}
