import { fetchRecruiterPublishedJobs } from '@/lib/jobs/fetch-published-jobs'
import type { JobRow } from '@/lib/supabase/database.types'

function arrayOverlap(a: string[] | null, b: string[] | null): number {
  if (!a?.length || !b?.length) return 0
  const set = new Set(a)
  return b.filter((item) => set.has(item)).length
}

/** Higher = more similar to `current`. */
function similarityScore(current: JobRow, candidate: JobRow): number {
  let score = 0
  if (candidate.job_type === current.job_type) score += 3
  if (candidate.experience_level === current.experience_level) score += 2
  if (candidate.work_mode === current.work_mode) score += 1
  if (arrayOverlap(current.skills, candidate.skills) > 0) score += 1
  if (arrayOverlap(current.modules, candidate.modules) > 0) score += 1
  if (arrayOverlap(current.certifications, candidate.certifications) > 0) {
    score += 1
  }
  return score
}

/**
 * Returns up to `limit` published recruiter jobs ranked by similarity to `current`.
 * Falls back to filling remaining slots with the most recent other roles.
 */
export async function fetchSimilarJobs(
  current: JobRow,
  limit = 3
): Promise<JobRow[]> {
  const all = await fetchRecruiterPublishedJobs({})
  const candidates = all.filter((job) => job.id !== current.id)

  const ranked = candidates
    .map((job) => ({ job, score: similarityScore(current, job) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.job.featured !== b.job.featured) {
        return Number(b.job.featured) - Number(a.job.featured)
      }
      return (
        new Date(b.job.created_at).getTime() -
        new Date(a.job.created_at).getTime()
      )
    })

  return ranked.slice(0, limit).map((entry) => entry.job)
}
