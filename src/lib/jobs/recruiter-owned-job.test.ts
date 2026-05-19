import { describe, expect, it } from 'vitest'
import type { JobRow } from '@/lib/supabase/database.types'
import {
  isRecruiterOwnedJob,
  recruiterOwnsJob,
  RECRUITER_OWNED_JOB_SOURCE,
} from '@/lib/jobs/recruiter-owned-job'

function job(
  overrides: Partial<Pick<JobRow, 'source_kind' | 'recruiter_id'>>
): Pick<JobRow, 'source_kind' | 'recruiter_id'> {
  return {
    source_kind: 'recruiter_posted',
    recruiter_id: 'rec-1',
    ...overrides,
  }
}

describe('recruiter-owned-job', () => {
  it('identifies recruiter_posted as owned', () => {
    expect(isRecruiterOwnedJob(job({}))).toBe(true)
    expect(RECRUITER_OWNED_JOB_SOURCE).toBe('recruiter_posted')
  })

  it('rejects linkedin_import', () => {
    expect(isRecruiterOwnedJob(job({ source_kind: 'linkedin_import' }))).toBe(
      false
    )
  })

  it('recruiterOwnsJob requires source and matching recruiter id', () => {
    expect(recruiterOwnsJob(job({}), 'rec-1')).toBe(true)
    expect(recruiterOwnsJob(job({ recruiter_id: 'rec-2' }), 'rec-1')).toBe(
      false
    )
    expect(
      recruiterOwnsJob(job({ source_kind: 'linkedin_import' }), 'rec-1')
    ).toBe(false)
  })
})
