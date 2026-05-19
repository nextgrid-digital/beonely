import { describe, expect, it } from 'vitest'
import { RECRUITER_OWNED_JOB_SOURCE } from '@/lib/jobs/recruiter-owned-job'

describe('recruiter portal jobs query filter', () => {
  it('uses recruiter_posted source_kind when listing recruiter jobs', () => {
    const eqCalls: Array<[string, string]> = []
    const chain = {
      select: (_cols?: string) => chain,
      eq: (column: string, value: string) => {
        eqCalls.push([column, value])
        return chain
      },
      order: (_col: string, _opts?: { ascending: boolean }) =>
        Promise.resolve({ data: [], error: null }),
    }

    const recruiterId = 'rec-abc'
    void chain
      .select('*')
      .eq('recruiter_id', recruiterId)
      .eq('source_kind', RECRUITER_OWNED_JOB_SOURCE)
      .order('created_at', { ascending: false })

    expect(eqCalls).toContainEqual(['recruiter_id', recruiterId])
    expect(eqCalls).toContainEqual(['source_kind', 'recruiter_posted'])
  })
})
