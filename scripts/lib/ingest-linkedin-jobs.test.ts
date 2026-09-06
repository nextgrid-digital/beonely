// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildIngestJobRow,
  buildIngestJobUpdate,
  normalizeCompanyLogoUrl,
  normalizeCompanyWebsiteUrl,
  normalizeLinkedInApplyUrl,
  parseIngestJobsFile,
  slugFromIngestJob,
} from './ingest-linkedin-jobs'

const recruiter = {
  id: 'rec-1',
  email: 'ops@beonely.com',
  name: 'Beonely Ops',
}

describe('normalizeLinkedInApplyUrl', () => {
  it('canonicalizes named paths and rejects non-job endpoints and ports', () => {
    expect(
      normalizeLinkedInApplyUrl(
        'https://www.linkedin.com/jobs/view/servicenow-developer-123?ref=x'
      )
    ).toBe('https://www.linkedin.com/jobs/view/123')
    expect(normalizeLinkedInApplyUrl('https://www.linkedin.com/login')).toBe('')
    expect(
      normalizeLinkedInApplyUrl('https://www.linkedin.com:8443/jobs/view/123')
    ).toBe('')
  })
  it('strips query and normalizes host', () => {
    expect(
      normalizeLinkedInApplyUrl('https://linkedin.com/jobs/view/123?utm=1')
    ).toBe('https://www.linkedin.com/jobs/view/123')
  })

  it('rejects non-HTTPS, credentialed, and non-LinkedIn urls', () => {
    expect(normalizeLinkedInApplyUrl('javascript:alert(1)')).toBe('')
    expect(
      normalizeLinkedInApplyUrl('http://www.linkedin.com/jobs/view/1')
    ).toBe('')
    expect(
      normalizeLinkedInApplyUrl(
        'https://user:pass@www.linkedin.com/jobs/view/1'
      )
    ).toBe('')
    expect(
      normalizeLinkedInApplyUrl('https://linkedin.example/jobs/view/1')
    ).toBe('')
  })
})

describe('company url normalization', () => {
  it('keeps valid logo urls and strips unsupported protocols', () => {
    expect(
      normalizeCompanyLogoUrl('https://media.licdn.com/logo.png#fragment')
    ).toBe('https://media.licdn.com/logo.png')
    expect(normalizeCompanyLogoUrl('javascript:alert(1)')).toBeNull()
  })

  it('normalizes website urls and strips query/hash', () => {
    expect(
      normalizeCompanyWebsiteUrl('https://example.com/careers?ref=li#top')
    ).toBe('https://example.com/careers')
    expect(
      normalizeCompanyWebsiteUrl('https://www.linkedin.com/company/acme')
    ).toBeNull()
  })
})

describe('slugFromIngestJob', () => {
  it('uses external_id when present', () => {
    expect(
      slugFromIngestJob({
        external_id: 'linkedin-999',
        job_title: 'Dev',
        company_name: 'Co',
        apply_url: 'https://www.linkedin.com/jobs/view/999',
        job_description: 'x',
      })
    ).toBe('linkedin-linkedin-999')
  })
})

describe('buildIngestJobRow', () => {
  const validJob = {
    job_title: 'ServiceNow Developer',
    company_name: 'Acme',
    apply_url: 'https://www.linkedin.com/jobs/view/1',
    job_description: 'Full posting',
    posted_at: '2026-08-01T00:00:00Z',
  }

  it('expires relative to the original posted date, never the import date', () => {
    const row = buildIngestJobRow(validJob, recruiter)
    expect(row.listing_expires_at).toBe('2026-10-30T00:00:00.000Z')
    expect(buildIngestJobUpdate(row)).not.toHaveProperty('approval_status')
    expect(buildIngestJobUpdate(row)).not.toHaveProperty('payment_status')
    expect(buildIngestJobUpdate(row)).not.toHaveProperty('source_kind')
    expect(buildIngestJobUpdate(row)).not.toHaveProperty('recruiter_id')
    expect(buildIngestJobUpdate(row)).not.toHaveProperty('featured')
  })

  it('does not move a known posted date forward during a later scrape', () => {
    const row = buildIngestJobRow(validJob, recruiter)
    expect(buildIngestJobUpdate(row, '2026-07-01T00:00:00Z')).toMatchObject({
      created_at: '2026-07-01T00:00:00.000Z',
      listing_expires_at: '2026-09-29T00:00:00.000Z',
    })
  })

  it.each([undefined, 'invalid', '2099-01-01'])(
    'rejects an unknown or future posting date: %s',
    (posted_at) => {
      expect(() =>
        buildIngestJobRow({ ...validJob, posted_at }, recruiter)
      ).toThrow(/posted_at/)
    }
  )
  it('auto-publishes linkedin imports', () => {
    const row = buildIngestJobRow(
      {
        job_title: 'ServiceNow Developer',
        company_name: 'Acme',
        company_logo: 'https://cdn.example.com/logo.svg#hash',
        company_website: 'https://acme.example/careers?utm=foo',
        apply_url: 'https://www.linkedin.com/jobs/view/1',
        job_description: 'Full text',
        posted_at: '2026-06-12',
        employment_type: 'contract',
        experience_level: 'senior',
        work_mode: 'remote',
        job_type: 'developer',
      },
      recruiter
    )
    expect(row.source_kind).toBe('linkedin_import')
    expect(row.approval_status).toBe('approved')
    expect(row.payment_status).toBe('paid')
    expect(row.created_at).toBe('2026-06-12T00:00:00.000Z')
    expect(row.listing_expires_at).toBeTruthy()
    expect(row.employment_type).toBe('contract')
    expect(row.company_logo).toBe('https://cdn.example.com/logo.svg')
    expect(row.company_website).toBe('https://acme.example/careers')
  })

  it('falls back to safe enum defaults', () => {
    const row = buildIngestJobRow(
      {
        job_title: 'Role',
        company_name: 'Co',
        apply_url: 'https://www.linkedin.com/jobs/view/2',
        posted_at: '2026-08-01',
        job_description: 'Body',
        employment_type: 'invalid',
        job_type: 'invalid',
      },
      recruiter
    )
    expect(row.employment_type).toBe('full_time')
    expect(row.job_type).toBe('other')
  })

  it('rejects an unsafe apply url', () => {
    expect(() =>
      buildIngestJobRow(
        {
          job_title: 'Role',
          company_name: 'Co',
          apply_url: 'javascript:alert(1)',
          job_description: 'Body',
        },
        recruiter
      )
    ).toThrow(/canonical HTTPS LinkedIn apply_url/)
  })
})

describe('parseIngestJobsFile', () => {
  it('parses a valid array', () => {
    const jobs = parseIngestJobsFile(
      JSON.stringify([
        {
          external_id: '1',
          job_title: 'Architect',
          company_name: 'Partner',
          apply_url: 'https://www.linkedin.com/jobs/view/1',
          job_description: 'Desc',
          posted_at: '2026-06-12T10:00:00.000Z',
        },
      ])
    )
    expect(jobs).toHaveLength(1)
    expect(jobs[0].job_title).toBe('Architect')
    expect(jobs[0].posted_at).toBe('2026-06-12T10:00:00.000Z')
  })

  it('parses optional company metadata fields', () => {
    const jobs = parseIngestJobsFile(
      JSON.stringify([
        {
          external_id: '1',
          job_title: 'Architect',
          company_name: 'Partner',
          company_logo: 'https://cdn.partner.com/logo.png',
          company_website: 'https://partner.com',
          apply_url: 'https://www.linkedin.com/jobs/view/1',
          job_description: 'Desc',
        },
      ])
    )
    expect(jobs[0].company_logo).toBe('https://cdn.partner.com/logo.png')
    expect(jobs[0].company_website).toBe('https://partner.com')
  })

  it('rejects invalid shape', () => {
    expect(() => parseIngestJobsFile('{}')).toThrow(/JSON array/)
  })

  it('rejects a non-LinkedIn apply url', () => {
    expect(() =>
      parseIngestJobsFile(
        JSON.stringify([
          {
            job_title: 'Architect',
            company_name: 'Partner',
            apply_url: 'https://example.com/apply',
            job_description: 'Desc',
          },
        ])
      )
    ).toThrow(/invalid LinkedIn apply_url/)
  })
})
