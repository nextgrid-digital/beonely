import type { SupabaseClient, User } from '@supabase/supabase-js'
import { safeResumeStoragePath } from '@/lib/candidate/application-assets'
import { isLinkedInProfileUrl } from '@/lib/candidate/linkedin-url'
import { resumeStructuredEnvelopeSchema } from '@/lib/candidate/resume-structured-schema'
import { safeHttpsUrl } from '@/lib/security/safe-url'
import type { Database, JobRow } from '@/lib/supabase/database.types'

type SB = SupabaseClient<Database>

function firstWorkSnapshot(structured: unknown): {
  company: string | null
} {
  const parsed = resumeStructuredEnvelopeSchema.safeParse(structured)
  if (!parsed.success) return { company: null }
  const work = parsed.data.sections.find((sec) =>
    /work|experience|employment/i.test(sec.title)
  )
  const first = work?.items[0]
  const company = first?.company?.trim()
  return { company: company || null }
}

export type SubmitBeonelyApplicationInput = {
  sb: SB
  job: Pick<JobRow, 'id' | 'recruiter_id' | 'source_kind'>
  authUser: User
  jobSeekerRow: {
    email: string
    full_name: string | null
    phone: string | null
    linkedin_url: string | null
    portfolio_url: string | null
    resume_structured: unknown
    resume_storage_path: string | null
  }
}

export async function submitBeonelyApplication(
  input: SubmitBeonelyApplicationInput
): Promise<{ error: string | null }> {
  const { sb, job, authUser, jobSeekerRow } = input
  if (job.source_kind !== 'recruiter_posted') {
    return { error: 'This job does not accept Beonely applications.' }
  }

  const email = jobSeekerRow.email?.trim() || authUser.email?.trim() || ''
  const name =
    jobSeekerRow.full_name?.trim() ||
    (authUser.user_metadata?.full_name as string | undefined)?.trim() ||
    authUser.email?.split('@')[0] ||
    'Candidate'

  const { company } = firstWorkSnapshot(jobSeekerRow.resume_structured)

  const snapshotParse = resumeStructuredEnvelopeSchema.safeParse(
    jobSeekerRow.resume_structured
  )
  const resume_structured_snapshot = snapshotParse.success
    ? snapshotParse.data
    : null

  const { error } = await sb.from('applications').insert({
    candidate_user_id: authUser.id,
    job_id: job.id,
    recruiter_id: job.recruiter_id,
    candidate_email: email,
    candidate_name: name,
    candidate_phone: jobSeekerRow.phone?.trim() || null,
    linkedin_url:
      jobSeekerRow.linkedin_url &&
      isLinkedInProfileUrl(jobSeekerRow.linkedin_url)
        ? jobSeekerRow.linkedin_url.trim()
        : null,
    current_company: company,
    experience_years: null,
    resume_url: safeHttpsUrl(jobSeekerRow.portfolio_url),
    resume_storage_path: safeResumeStoragePath(
      jobSeekerRow.resume_storage_path,
      authUser.id
    ),
    resume_structured_snapshot,
    status: 'new',
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'You have already applied to this job.' }
    }
    return { error: error.message }
  }
  return { error: null }
}
