import {
  defaultResumeStructured,
  type ResumeStructuredV1,
} from '@/lib/candidate/resume-structured-schema'

export type AccountResumePrefill = {
  email: string
  full_name: string | null
  phone: string | null
  linkedin_url: string | null
  portfolio_url: string | null
}

export function resumeStructuredIsV1(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  return (raw as { schemaVersion?: number }).schemaVersion === 1
}

/** True when the user has not changed the default placeholder name from the template. */
export function isUnpersonalizedTemplateResume(
  parsed: ResumeStructuredV1
): boolean {
  return parsed.general.name === defaultResumeStructured().general.name
}

export function shouldPrefillResumeFromAccount(
  raw: unknown,
  parsed: ResumeStructuredV1
): boolean {
  if (!resumeStructuredIsV1(raw)) return true
  return isUnpersonalizedTemplateResume(parsed)
}

function telHref(phone: string): string {
  const t = phone.trim()
  if (!t) return ''
  if (t.toLowerCase().startsWith('tel:')) return t
  return `tel:${t.replace(/\s+/g, '')}`
}

function contactHrefExists(
  contacts: ResumeStructuredV1['general']['contacts'],
  href: string
): boolean {
  const h = href.trim().toLowerCase()
  return contacts.some((c) => c.href.trim().toLowerCase() === h)
}

/** Remove built-in placeholder contact rows so real account rows can replace them. */
function stripTemplatePlaceholderContacts(
  contacts: ResumeStructuredV1['general']['contacts']
): ResumeStructuredV1['general']['contacts'] {
  const tplHrefs = new Set(
    defaultResumeStructured().general.contacts.map((c) =>
      c.href.trim().toLowerCase()
    )
  )
  return contacts.filter((c) => !tplHrefs.has(c.href.trim().toLowerCase()))
}

function linkedinDisplay(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/$/, '')
    return path.length > 1 ? path.slice(1) : url
  } catch {
    return url
  }
}

/**
 * Merges account fields into a parsed resume when the row is still a template or not yet v1.
 * Removes default template contact rows (placeholder mailto/LinkedIn) before merging.
 */
export function prefillResumeFromProfile(
  parsed: ResumeStructuredV1,
  profile: AccountResumePrefill | null,
  userEmail: string
): ResumeStructuredV1 {
  const email = (profile?.email ?? userEmail).trim()
  const fullName = profile?.full_name?.trim() ?? ''
  const phone = profile?.phone?.trim() ?? ''
  const linkedin = profile?.linkedin_url?.trim() ?? ''
  const portfolio = profile?.portfolio_url?.trim() ?? ''

  let general = { ...parsed.general }
  const contacts = stripTemplatePlaceholderContacts([
    ...parsed.general.contacts,
  ])

  if (fullName) {
    general = { ...general, name: fullName }
  } else if (email && general.name === defaultResumeStructured().general.name) {
    const local = email.split('@')[0] ?? ''
    if (local) general = { ...general, name: local }
  }

  if (portfolio && !general.website.trim()) {
    general = { ...general, website: portfolio }
  }

  if (email) {
    const href = `mailto:${email}`
    if (!contactHrefExists(contacts, href)) {
      contacts.unshift({ label: 'Email', value: email, href })
    }
  }

  if (phone) {
    const href = telHref(phone)
    if (href && !contactHrefExists(contacts, href)) {
      contacts.push({ label: 'Phone', value: phone, href })
    }
  }

  if (linkedin) {
    const href = linkedin
    if (!contactHrefExists(contacts, href)) {
      contacts.push({
        label: 'LinkedIn',
        value: linkedinDisplay(linkedin),
        href,
      })
    }
  }

  general = { ...general, contacts }
  return { ...parsed, general }
}
