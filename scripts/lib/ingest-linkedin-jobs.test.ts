// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildIngestJobRow,
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
  it('strips query and normalizes host', () => {
    expect(
      normalizeLinkedInApplyUrl(
        'https://linkedin.com/jobs/view/123?utm=1'
      )
    ).toBe('https://www.linkedin.com/jobs/view/123')
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
    expect(normalizeCompanyWebsiteUrl('https://www.linkedin.com/company/acme')).toBeNull()
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
  it('auto-publishes linkedin imports', () => {
    const row = buildIngestJobRow(
      {
        job_title: 'ServiceNow Developer',
        company_name: 'Acme',
        company_logo: 'https://cdn.example.com/logo.svg#hash',
        company_website: 'https://acme.example/careers?utm=foo',
        apply_url: 'https://www.linkedin.com/jobs/view/1',
        job_description: 'Full text',
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
        job_description: 'Body',
        employment_type: 'invalid',
        job_type: 'invalid',
      },
      recruiter
    )
    expect(row.employment_type).toBe('full_time')
    expect(row.job_type).toBe('other')
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
        },
      ])
    )
    expect(jobs).toHaveLength(1)
    expect(jobs[0].job_title).toBe('Architect')
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
})
