import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { defaultResumeStructured } from '@/lib/candidate/resume-structured-schema'
import { submitBeonelyApplication } from '@/lib/jobs/submit-beonely-application'
import type { Database, JobRow } from '@/lib/supabase/database.types'

type SB = SupabaseClient<Database>

describe('submitBeonelyApplication', () => {
  it('rejects non-recruiter_posted jobs', async () => {
    const sb = {
      from: vi.fn(),
    } as unknown as SB
    const job = {
      id: 'j1',
      recruiter_id: 'r1',
      source_kind: 'linkedin_import',
    } as Pick<JobRow, 'id' | 'recruiter_id' | 'source_kind'>
    const res = await submitBeonelyApplication({
      sb,
      job,
      authUser: { id: 'u1', email: 'a@b.com' } as never,
      jobSeekerRow: {
        email: 'a@b.com',
        full_name: 'A',
        phone: '1',
        linkedin_url: 'https://www.linkedin.com/in/a',
        portfolio_url: null,
        resume_structured: null,
        resume_storage_path: null,
      },
    })
    expect(res.error).toMatch(/does not accept Beonely/)
    expect(sb.from).not.toHaveBeenCalled()
  })

  it('inserts resume_structured_snapshot when resume JSON is valid', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const sb = {
      from: vi.fn(() => ({
        insert,
      })),
    } as unknown as SB
    const job = {
      id: 'j1',
      recruiter_id: 'r1',
      source_kind: 'recruiter_posted',
    } as Pick<JobRow, 'id' | 'recruiter_id' | 'source_kind'>
    const structured = defaultResumeStructured()
    const res = await submitBeonelyApplication({
      sb,
      job,
      authUser: { id: 'u1', email: 'a@b.com' } as never,
      jobSeekerRow: {
        email: 'a@b.com',
        full_name: 'A',
        phone: '+1 555 123 4567',
        linkedin_url: 'https://www.linkedin.com/in/a',
        portfolio_url: null,
        resume_structured: structured,
        resume_storage_path: null,
      },
    })
    expect(res.error).toBeNull()
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        resume_structured_snapshot: structured,
      })
    )
  })
})
