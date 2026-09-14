import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPublishedJobFilters,
  experienceFilterValue,
  filterNonExpiredJobs,
  postedSinceIso,
  publishedJobsFilterSchema,
} from '@/lib/jobs/published-jobs-query'
import type { JobRow } from '@/lib/supabase/database.types'

afterEach(() => vi.useRealTimers())

describe('date posted filters', () => {
  it.each([
    ['24h', '2026-09-05T12:00:00.000Z'],
    ['7d', '2026-08-30T12:00:00.000Z'],
    ['30d', '2026-08-07T12:00:00.000Z'],
    ['90d', '2026-06-08T12:00:00.000Z'],
  ])('uses an exact rolling cutoff for %s', (token, cutoff) => {
    expect(postedSinceIso(token, new Date('2026-09-06T12:00:00Z'))).toBe(cutoff)
  })

  it('accepts shareable 90-day URLs and ignores unknown date tokens', () => {
    expect(publishedJobsFilterSchema.parse({ posted: '90d' }).posted).toBe(
      '90d'
    )
    expect(
      publishedJobsFilterSchema.parse({ posted: 'oops' }).posted
    ).toBeUndefined()
    expect(postedSinceIso(undefined)).toBeUndefined()
  })
})

describe('public query filters', () => {
  function querySpy() {
    return {
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
    }
  }

  it('quotes punctuation as data instead of allowing extra OR conditions', () => {
    const query = querySpy()
    applyPublishedJobFilters(query, { q: 'Acme, Inc. ("Now")' })
    expect(query.or).toHaveBeenCalledWith(
      'job_title.ilike."%Acme, Inc. (\\"Now\\")%",company_name.ilike."%Acme, Inc. (\\"Now\\")%"'
    )
  })

  it('escapes LIKE wildcards and backslashes for title and location', () => {
    const query = querySpy()
    applyPublishedJobFilters(query, { q: '100%_\\', location: '100%_' })
    expect(query.or).toHaveBeenCalledWith(
      String.raw`job_title.ilike."%100\\%\\_\\\\%",company_name.ilike."%100\\%\\_\\\\%"`
    )
    expect(query.ilike).toHaveBeenCalledWith('location', String.raw`%100\%\_%`)
  })

  it('combines date, role and work filters in the database query', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-06T12:00:00Z'))
    const query = querySpy()
    applyPublishedJobFilters(query, {
      posted: '90d',
      role: 'developer',
      work: 'remote',
    })
    expect(query.gte).toHaveBeenCalledWith(
      'created_at',
      '2026-06-08T12:00:00.000Z'
    )
    expect(query.eq).toHaveBeenCalledWith('job_type', 'developer')
    expect(query.eq).toHaveBeenCalledWith('work_mode', 'remote')
  })
})

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
