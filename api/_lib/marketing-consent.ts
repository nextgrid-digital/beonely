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

  const { data: existing, error: lookupError } = await sb
    .from('email_subscribers')
    .select('id, unsubscribed_at')
    .eq('email', email)
    .maybeSingle()
  if (lookupError)
    throw new Error(`consent_lookup_failed: ${lookupError.message}`)

  if (opts.optIn) {
    if (existing?.id) {
      const { error } = await sb
        .from('email_subscribers')
        .update({
          audience: opts.audience,
          unsubscribed_at: null,
          source: opts.source,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (error) throw new Error(`consent_update_failed: ${error.message}`)
    } else {
      const { error } = await sb.from('email_subscribers').insert({
        email,
        audience: opts.audience,
        source: opts.source,
      })
      if (error) throw new Error(`consent_insert_failed: ${error.message}`)
    }
    return
  }

  if (existing?.id) {
    const { error } = await sb
      .from('email_subscribers')
      .update({
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw new Error(`consent_update_failed: ${error.message}`)
  } else {
    const now = new Date().toISOString()
    const { error } = await sb.from('email_subscribers').insert({
      email,
      audience: opts.audience,
      source: opts.source,
      unsubscribed_at: now,
    })
    if (error) throw new Error(`consent_insert_failed: ${error.message}`)
  }
}

export async function unsubscribeByToken(
  sb: SupabaseClient,
  token: string
): Promise<{ ok: boolean; email?: string }> {
  const trimmed = token.trim()
  if (!trimmed) return { ok: false }

  const { data: sub, error: lookupError } = await sb
    .from('email_subscribers')
    .select('id, email, unsubscribed_at')
    .eq('unsubscribe_token', trimmed)
    .maybeSingle()

  if (lookupError || !sub?.id) return { ok: false }

  const now = new Date().toISOString()
  const { error: subscriberError } = await sb
    .from('email_subscribers')
    .update({ unsubscribed_at: now, updated_at: now })
    .eq('id', sub.id)
  if (subscriberError) return { ok: false }

  const email = normalizeEmail(sub.email)
  const { error: candidateError } = await sb
    .from('job_seeker_profiles')
    .update({ marketing_opt_in: false, marketing_opt_in_at: null })
    .eq('email', email)
  const { error: recruiterError } = await sb
    .from('recruiters')
    .update({ marketing_opt_in: false, marketing_opt_in_at: null })
    .eq('email', email)

  if (candidateError || recruiterError) return { ok: false }

  return { ok: true, email: sub.email }
}
