import type { SupabaseClient } from '@supabase/supabase-js'
import type { ResumeStructuredV1 } from '@/lib/candidate/resume-structured-schema'
import { deriveProfileColumnsFromResume } from '@/lib/candidate/resume-to-profile-columns'
import { sanitizeResumeStructuredRichFields } from '@/lib/candidate/sanitize-resume-html'

export async function persistCandidateProfileDraft(
  sb: SupabaseClient,
  opts: {
    draft: ResumeStructuredV1
    userId: string
    userEmail: string
    profileRow: {
      id: string
      linkedin_url?: string | null
      phone?: string | null
      notification_opt_in?: boolean
    } | null
  }
): Promise<void> {
  const preserve =
    opts.profileRow != null
      ? {
          linkedin_url: opts.profileRow.linkedin_url ?? null,
          phone: opts.profileRow.phone ?? null,
        }
      : null
  const sanitized = sanitizeResumeStructuredRichFields(opts.draft)
  const derived = deriveProfileColumnsFromResume(sanitized, preserve)
  const email = opts.userEmail.trim()
  if (!email) throw new Error('missing_email')

  const resumePayload = {
    resume_structured: sanitized,
    resume_source: 'user_edit' as const,
    full_name: derived.full_name,
    portfolio_url: derived.portfolio_url,
    linkedin_url: derived.linkedin_url.trim() || null,
    phone: derived.phone.trim() || null,
  }

  // Resolve the target row defensively. The passed-in `profileRow` can be
  // stale, null, or loaded by a query that did not select `id` (e.g. cached as
  // null, or a row auto-created by metadata sync after this prop was read).
  // Relying on it alone caused a blind INSERT that collides with the row's
  // unique email constraint (409). Always confirm via `user_id` first.
  let targetId = opts.profileRow?.id ?? null
  let notificationOptIn = opts.profileRow?.notification_opt_in ?? true
  if (!targetId) {
    const { data: existing, error: lookupError } = await sb
      .from('job_seeker_profiles')
      .select('id, notification_opt_in')
      .eq('user_id', opts.userId)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (existing?.id) {
      targetId = existing.id
      notificationOptIn = existing.notification_opt_in ?? true
    }
  }

  if (targetId) {
    const { error } = await sb
      .from('job_seeker_profiles')
      .update({
        ...resumePayload,
        notification_opt_in: notificationOptIn,
      })
      .eq('id', targetId)
    if (error) throw error
    return
  }

  const now = new Date().toISOString()
  const { error } = await sb.from('job_seeker_profiles').insert({
    user_id: opts.userId,
    email,
    ...resumePayload,
    notification_opt_in: true,
    marketing_opt_in: true,
    marketing_opt_in_at: now,
  })
  if (error) throw error
}
