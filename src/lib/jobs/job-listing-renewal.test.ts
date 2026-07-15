import { describe, expect, it } from 'vitest'
import { jobListingCanRenew } from '@/lib/jobs/job-listing-renewal'
import type { JobRow } from '@/lib/supabase/database.types'

function job(partial: Partial<JobRow>): JobRow {
  return {
    id: '1',
    recruiter_id: 'r1',
    job_slug: 'slug',
    job_title: 'Dev',
    company_name: 'Co',
    approval_status: 'approved',
    payment_status: 'paid',
    listing_expires_at: null,
    featured: false,
    ...partial,
  } as JobRow
}

describe('jobListingCanRenew', () => {
  const now = new Date('2026-05-20T12:00:00Z')

  it('allows extend within 7 days of expiry', () => {
    const exp = new Date(now)
    exp.setUTCDate(exp.getUTCDate() + 5)
    expect(
      jobListingCanRenew(job({ listing_expires_at: exp.toISOString() }), now)
    ).toBe(true)
  })

  it('allows reactivate within 30 days after expiry', () => {
    const exp = new Date(now)
    exp.setUTCDate(exp.getUTCDate() - 10)
    expect(
      jobListingCanRenew(job({ listing_expires_at: exp.toISOString() }), now)
    ).toBe(true)
  })

  it('rejects renew when too far from expiry', () => {
    const exp = new Date(now)
    exp.setUTCDate(exp.getUTCDate() + 20)
    expect(
      jobListingCanRenew(job({ listing_expires_at: exp.toISOString() }), now)
    ).toBe(false)
  })
})
