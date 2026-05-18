import type { SupabaseClient, User } from '@supabase/supabase-js'
import { defaultResumeStructured } from '@/lib/candidate/resume-structured-schema'

/**
 * Copy `linkedin_url` and `phone` from auth user_metadata into `job_seeker_profiles`
 * when the row is missing or those fields are still empty (e.g. after email-confirm sign-up).
 */
export async function syncJobSeekerFromUserMetadata(
  sb: SupabaseClient,
  user: User
): Promise<void> {
  const meta = user.user_metadata as
    | {
        linkedin_url?: unknown
        phone?: unknown
      }
    | undefined
  const linkedinMeta =
    typeof meta?.linkedin_url === 'string' ? meta.linkedin_url.trim() : ''
  const phoneMeta = typeof meta?.phone === 'string' ? meta.phone.trim() : ''
  if (!linkedinMeta && !phoneMeta) return

  const { data: existing, error } = await sb
    .from('job_seeker_profiles')
    .select('id, linkedin_url, phone')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error

  const email = user.email ?? ''

  const patchFromMeta = (
    metaVal: string,
    current: string | null | undefined
  ): string | undefined => {
    if (!metaVal) return undefined
    if (current?.trim()) return undefined
    return metaVal
  }

  if (existing?.id) {
    const nextLinkedin = patchFromMeta(
      linkedinMeta,
      existing.linkedin_url ?? undefined
    )
    const nextPhone = patchFromMeta(phoneMeta, existing.phone ?? undefined)
    if (nextLinkedin === undefined && nextPhone === undefined) return
    const patch: { linkedin_url?: string; phone?: string } = {}
    if (nextLinkedin !== undefined) patch.linkedin_url = nextLinkedin
    if (nextPhone !== undefined) patch.phone = nextPhone
    const { error: uErr } = await sb
      .from('job_seeker_profiles')
      .update(patch)
      .eq('id', existing.id)
    if (uErr) throw uErr
    return
  }

  const now = new Date().toISOString()
  const { error: iErr } = await sb.from('job_seeker_profiles').insert({
    user_id: user.id,
    email,
    linkedin_url: linkedinMeta || null,
    phone: phoneMeta || null,
    resume_structured: defaultResumeStructured(),
    resume_source: 'user_edit',
    notification_opt_in: true,
    marketing_opt_in: true,
    marketing_opt_in_at: now,
  })
  if (iErr) throw iErr
}
