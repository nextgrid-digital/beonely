import type { SupabaseClient } from '@supabase/supabase-js'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function syncSubscriberForMarketingOptIn(
  sb: SupabaseClient,
  opts: {
    email: string
    audience: 'candidate' | 'recruiter' | 'newsletter'
    optIn: boolean
    source: string
  }
): Promise<void> {
  const email = normalizeEmail(opts.email)
  if (!email) return

  const { data: existing } = await sb
    .from('email_subscribers')
    .select('id, unsubscribed_at')
    .eq('email', email)
    .maybeSingle()

  if (opts.optIn) {
    if (existing?.id) {
      await sb
        .from('email_subscribers')
        .update({
          audience: opts.audience,
          unsubscribed_at: null,
          source: opts.source,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await sb.from('email_subscribers').insert({
        email,
        audience: opts.audience,
        source: opts.source,
      })
    }
    return
  }

  if (existing?.id) {
    await sb
      .from('email_subscribers')
      .update({
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  }
}

export async function unsubscribeByToken(
  sb: SupabaseClient,
  token: string
): Promise<{ ok: boolean; email?: string }> {
  const trimmed = token.trim()
  if (!trimmed) return { ok: false }

  const { data: sub } = await sb
    .from('email_subscribers')
    .select('id, email, unsubscribed_at')
    .eq('unsubscribe_token', trimmed)
    .maybeSingle()

  if (!sub?.id) return { ok: false }

  const now = new Date().toISOString()
  await sb
    .from('email_subscribers')
    .update({ unsubscribed_at: now, updated_at: now })
    .eq('id', sub.id)

  const email = normalizeEmail(sub.email)
  await sb
    .from('job_seeker_profiles')
    .update({ marketing_opt_in: false, marketing_opt_in_at: null })
    .eq('email', email)
  await sb
    .from('recruiters')
    .update({ marketing_opt_in: false, marketing_opt_in_at: null })
    .eq('email', email)

  return { ok: true, email: sub.email }
}
