import type { User } from '@supabase/supabase-js'
import { defaultResumeStructured } from '@/lib/candidate/resume-structured-schema'
import { syncJobSeekerFromUserMetadata } from '@/lib/candidate/sync-job-seeker-from-metadata'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

/** Ensure allowlisted staff have a job_seeker_profiles row for candidate preview. */
export async function ensureAdminCandidateProfile(user: User): Promise<void> {
  const sb = getSupabaseBrowserClient()
  await syncJobSeekerFromUserMetadata(sb, user)
  const { data: existing } = await sb
    .from('job_seeker_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing?.id) return
  const email = user.email?.trim()
  if (!email) return
  await sb.from('job_seeker_profiles').insert({
    user_id: user.id,
    email,
    resume_structured: defaultResumeStructured(),
    resume_source: 'user_edit',
    notification_opt_in: true,
    marketing_opt_in: true,
    marketing_opt_in_at: new Date().toISOString(),
  })
}
