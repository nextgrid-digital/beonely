import { describe, expect, it } from 'vitest'
import { sortPublishedJobsForFeed } from '@/lib/jobs/sort-published-jobs'
import type { JobRow } from '@/lib/supabase/database.types'

function mockJob(
  base: Pick<JobRow, 'id' | 'source_kind' | 'created_at'> &
    Partial<Omit<JobRow, 'id' | 'source_kind' | 'created_at'>>
): JobRow {
  const { id, source_kind, created_at, ...rest } = base
  return {
    apply_url: 'https://example.com',
    approval_status: 'approved',
    certifications: [],
    company_logo: null,
    company_name: 'Co',
    company_website: null,
    created_at,
    employment_type: 'full_time',
    experience_level: 'mid',
    featured: false,
    featured_expiry: null,
    id,
    job_description: 'd',
    job_slug: 'slug',
    job_title: 'Title',
    job_type: 'developer',
    listing_duration: 'monthly',
    listing_expires_at: null,
    listing_tier: 'standard',
    location: 'Remote',
    modules: [],
    payment_status: 'paid',
    recruiter_email: 'r@r.com',
    recruiter_id: 'rec-1',
    recruiter_name: 'R',
    salary_range: null,
    skills: [],
    source_kind,
    updated_at: created_at,
    work_mode: 'remote',
    ...rest,
  }
}

describe('sortPublishedJobsForFeed', () => {
  it('lists recruiter_posted before linkedin_import', () => {
    const olderRecruiter = mockJob({
      id: '1',
      source_kind: 'recruiter_posted',
      created_at: '2020-01-01T00:00:00Z',
      featured: false,
    })
    const newerImport = mockJob({
      id: '2',
      source_kind: 'linkedin_import',
      created_at: '2025-01-01T00:00:00Z',
      featured: true,
    })
    const sorted = sortPublishedJobsForFeed([newerImport, olderRecruiter])
    expect(sorted.map((j) => j.id)).toEqual(['1', '2'])
  })

  it('within recruiter_posted, featured and featured tier sort before others', () => {
    const a = mockJob({
      id: 'a',
      source_kind: 'recruiter_posted',
      created_at: '2025-01-02T00:00:00Z',
      featured: false,
      listing_tier: 'standard',
    })
    const b = mockJob({
      id: 'b',
      source_kind: 'recruiter_posted',
      created_at: '2025-01-01T00:00:00Z',
      featured: true,
      listing_tier: 'standard',
    })
    const c = mockJob({
      id: 'c',
      source_kind: 'recruiter_posted',
      created_at: '2025-01-03T00:00:00Z',
      featured: false,
      listing_tier: 'featured',
    })
    const sorted = sortPublishedJobsForFeed([a, b, c])
    expect(sorted.map((j) => j.id)).toEqual(['b', 'c', 'a'])
  })
})
