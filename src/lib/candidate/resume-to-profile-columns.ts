import { z } from 'zod'
import { isLinkedInProfileUrl } from '@/lib/candidate/linkedin-url'
import type { ResumeStructuredV1 } from '@/lib/candidate/resume-structured-schema'

const portfolioUrlSchema = z.union([z.literal(''), z.string().url()])

export type ProfileColumnsFromResume = {
  full_name: string | null
  portfolio_url: string | null
  linkedin_url: string
  phone: string
}

function phoneFromTelHref(href: string): string {
  const h = href.trim()
  if (!/^tel:/i.test(h)) return ''
  const rest = h.slice(4)
  try {
    return decodeURIComponent(rest).replace(/\s+/g, ' ').trim()
  } catch {
    return rest.replace(/\s+/g, ' ').trim()
  }
}

/**
 * Maps structured profile JSON to `job_seeker_profiles` columns.
 * When LinkedIn/phone are not found on contact rows, falls back to `preserve` (e.g. sign-up values).
 */
export function deriveProfileColumnsFromResume(
  draft: ResumeStructuredV1,
  preserve: { linkedin_url: string | null; phone: string | null } | null
): ProfileColumnsFromResume {
  let linkedin = ''
  let phone = ''
  for (const c of draft.general.contacts) {
    const h = c.href.trim()
    if (!linkedin && isLinkedInProfileUrl(h)) linkedin = h
    if (!phone) {
      const fromTel = phoneFromTelHref(h)
      if (fromTel) phone = fromTel
    }
  }
  if (!linkedin) linkedin = preserve?.linkedin_url?.trim() ?? ''
  if (!phone) phone = preserve?.phone?.trim() ?? ''

  const website = draft.general.website.trim()
  const portfolioParsed = portfolioUrlSchema.safeParse(website)
  const portfolio_url =
    website === '' ? null : portfolioParsed.success ? website : null

  const name = draft.general.name.trim()
  return {
    full_name: name || null,
    portfolio_url,
    linkedin_url: linkedin,
    phone,
  }
}
