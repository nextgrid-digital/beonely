import type { SupabaseClient } from '@supabase/supabase-js'

export type CampaignAudience =
  | 'candidates'
  | 'recruiters'
  | 'newsletter'
  | 'all_marketing'
  | 'subscribers'
  | 'both'

export type ResolvedRecipient = {
  email: string
  recipient_type: string
  unsubscribe_token: string | null
}

type EmailOnlyRow = { email: string | null }
type NewsletterRow = { email: string | null; unsubscribe_token: string | null }
type SubscriberRow = {
  email: string | null
  unsubscribe_token: string
  unsubscribed_at: string | null
}

const SOURCE_PAGE_SIZE = 1_000

async function candidateRows(sb: SupabaseClient): Promise<EmailOnlyRow[]> {
  const rows: EmailOnlyRow[] = []
  for (let offset = 0; ; offset += SOURCE_PAGE_SIZE) {
    const { data, error } = await sb
      .from('job_seeker_profiles')
      .select('email')
      .eq('marketing_opt_in', true)
      .not('email', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + SOURCE_PAGE_SIZE - 1)
    if (error) throw new Error(`candidate_audience_failed: ${error.message}`)
    const page = (data ?? []) as EmailOnlyRow[]
    rows.push(...page)
    if (page.length < SOURCE_PAGE_SIZE) return rows
  }
}

async function recruiterRows(sb: SupabaseClient): Promise<EmailOnlyRow[]> {
  const rows: EmailOnlyRow[] = []
  for (let offset = 0; ; offset += SOURCE_PAGE_SIZE) {
    const { data, error } = await sb
      .from('recruiters')
      .select('email')
      .eq('marketing_opt_in', true)
      .eq('disabled', false)
      .not('email', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + SOURCE_PAGE_SIZE - 1)
    if (error) throw new Error(`recruiter_audience_failed: ${error.message}`)
    const page = (data ?? []) as EmailOnlyRow[]
    rows.push(...page)
    if (page.length < SOURCE_PAGE_SIZE) return rows
  }
}

async function newsletterRows(sb: SupabaseClient): Promise<NewsletterRow[]> {
  const rows: NewsletterRow[] = []
  for (let offset = 0; ; offset += SOURCE_PAGE_SIZE) {
    const { data, error } = await sb
      .from('email_subscribers')
      .select('email, unsubscribe_token')
      .eq('audience', 'newsletter')
      .is('unsubscribed_at', null)
      .order('id', { ascending: true })
      .range(offset, offset + SOURCE_PAGE_SIZE - 1)
    if (error) throw new Error(`newsletter_audience_failed: ${error.message}`)
    const page = (data ?? []) as NewsletterRow[]
    rows.push(...page)
    if (page.length < SOURCE_PAGE_SIZE) return rows
  }
}

function dedupeRecipients(rows: ResolvedRecipient[]): ResolvedRecipient[] {
  const seen = new Set<string>()
  const out: ResolvedRecipient[] = []
  for (const row of rows) {
    const key = row.email.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ ...row, email: key })
  }
  return out
}

export async function resolveCampaignAudience(
  sb: SupabaseClient,
  audience: CampaignAudience,
  filters?: { job_type?: string; work_mode?: string }
): Promise<ResolvedRecipient[]> {
  const parts: ResolvedRecipient[][] = []

  const wantCandidates =
    audience === 'candidates' ||
    audience === 'all_marketing' ||
    audience === 'both'
  const wantRecruiters =
    audience === 'recruiters' ||
    audience === 'all_marketing' ||
    audience === 'both'
  const wantNewsletter =
    audience === 'newsletter' ||
    audience === 'subscribers' ||
    audience === 'all_marketing' ||
    audience === 'both'

  if (wantCandidates) {
    void filters
    const data = await candidateRows(sb)
    parts.push(
      ((data ?? []) as EmailOnlyRow[]).map((r) => ({
        email: (r.email as string).trim(),
        recipient_type: 'candidate',
        unsubscribe_token: null,
      }))
    )
  }

  if (wantRecruiters) {
    const data = await recruiterRows(sb)
    parts.push(
      ((data ?? []) as EmailOnlyRow[]).map((r) => ({
        email: (r.email as string).trim(),
        recipient_type: 'recruiter',
        unsubscribe_token: null,
      }))
    )
  }

  if (wantNewsletter) {
    const data = await newsletterRows(sb)
    parts.push(
      ((data ?? []) as NewsletterRow[]).map((r) => ({
        email: (r.email as string).trim(),
        recipient_type: 'newsletter',
        unsubscribe_token: r.unsubscribe_token as string,
      }))
    )
  }

  const merged = dedupeRecipients(parts.flat())
  const emails = merged.map((m) => m.email)
  if (emails.length === 0) return merged

  const subscribers: SubscriberRow[] = []
  for (let offset = 0; offset < emails.length; offset += 500) {
    const { data, error } = await sb
      .from('email_subscribers')
      .select('email, unsubscribe_token, unsubscribed_at')
      .in('email', emails.slice(offset, offset + 500))
    if (error) {
      throw new Error(`suppression_lookup_failed: ${error.message}`)
    }
    subscribers.push(...((data ?? []) as SubscriberRow[]))
  }

  const subByEmail = new Map<string, SubscriberRow>(
    subscribers.map((s) => [(s.email as string).trim().toLowerCase(), s])
  )

  return merged.filter((m) => {
    const sub = subByEmail.get(m.email)
    if (sub?.unsubscribed_at) return false
    if (!m.unsubscribe_token && sub?.unsubscribe_token) {
      m.unsubscribe_token = sub.unsubscribe_token
    }
    return true
  })
}
