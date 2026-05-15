import { describe, expect, it } from 'vitest'
import {
  experienceFilterValue,
  filterNonExpiredJobs,
} from '@/lib/jobs/published-jobs-query'
import type { JobRow } from '@/lib/supabase/database.types'

function minimalJob(overrides: Partial<JobRow>): JobRow {
  return {
    apply_url: 'https://example.com',
    approval_status: 'approved',
    certifications: [],
    company_logo: null,
    company_name: 'Co',
    company_website: null,
    created_at: '2025-01-01T00:00:00Z',
    employment_type: 'full_time',
    experience_level: 'mid',
    featured: false,
    featured_expiry: null,
    id: '1',
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
    source_kind: 'linkedin_import',
    updated_at: '2025-01-01T00:00:00Z',
    work_mode: 'remote',
    ...overrides,
  }
}

describe('experienceFilterValue', () => {
  it('maps junior to entry', () => {
    expect(experienceFilterValue('junior')).toBe('entry')
  })

  it('passes through other values', () => {
    expect(experienceFilterValue('senior')).toBe('senior')
  })
})

describe('filterNonExpiredJobs', () => {
  it('keeps jobs without expiry', () => {
    const jobs = [minimalJob({ listing_expires_at: null })]
    expect(filterNonExpiredJobs(jobs)).toHaveLength(1)
  })

  it('drops expired jobs', () => {
    const jobs = [
      minimalJob({
        id: 'expired',
        listing_expires_at: '2020-01-01T00:00:00Z',
      }),
      minimalJob({
        id: 'active',
        listing_expires_at: '2099-01-01T00:00:00Z',
      }),
    ]
    expect(filterNonExpiredJobs(jobs).map((j) => j.id)).toEqual(['active'])
  })
})
