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
    audience === 'candidates' || audience === 'all_marketing' || audience === 'both'
  const wantRecruiters =
    audience === 'recruiters' || audience === 'all_marketing' || audience === 'both'
  const wantNewsletter =
    audience === 'newsletter' ||
    audience === 'subscribers' ||
    audience === 'all_marketing' ||
    audience === 'both'

  if (wantCandidates) {
    void filters
    const { data } = await sb
      .from('job_seeker_profiles')
      .select('email')
      .eq('marketing_opt_in', true)
      .not('email', 'is', null)
    parts.push(
      (data ?? []).map((r) => ({
        email: (r.email as string).trim(),
        recipient_type: 'candidate',
        unsubscribe_token: null,
      }))
    )
  }

  if (wantRecruiters) {
    const { data } = await sb
      .from('recruiters')
      .select('email')
      .eq('marketing_opt_in', true)
      .eq('disabled', false)
      .not('email', 'is', null)
    parts.push(
      (data ?? []).map((r) => ({
        email: (r.email as string).trim(),
        recipient_type: 'recruiter',
        unsubscribe_token: null,
      }))
    )
  }

  if (wantNewsletter) {
    const { data } = await sb
      .from('email_subscribers')
      .select('email, unsubscribe_token')
      .eq('audience', 'newsletter')
      .is('unsubscribed_at', null)
    parts.push(
      (data ?? []).map((r) => ({
        email: (r.email as string).trim(),
        recipient_type: 'newsletter',
        unsubscribe_token: r.unsubscribe_token as string,
      }))
    )
  }

  const merged = dedupeRecipients(parts.flat())
  const emails = merged.map((m) => m.email)
  if (emails.length === 0) return merged

  const { data: subs } = await sb
    .from('email_subscribers')
    .select('email, unsubscribe_token, unsubscribed_at')
    .in('email', emails)

  const subByEmail = new Map(
    (subs ?? []).map((s) => [
      (s.email as string).trim().toLowerCase(),
      s as { unsubscribe_token: string; unsubscribed_at: string | null },
    ])
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
