import { describe, expect, it } from 'vitest'
import {
  jobOgDescription,
  jobOgMetaChips,
  jobOgTitle,
  stripHtmlToPlain,
  truncateText,
} from './job-og-meta.js'
import type { PublicJobRow } from './public-job.js'

const sampleJob: PublicJobRow = {
  id: '1',
  job_slug: 'acme-dev',
  job_title: 'ServiceNow Developer',
  company_name: 'Acme Corp',
  location: 'Bengaluru',
  employment_type: 'full_time',
  work_mode: 'remote',
  featured: true,
  job_description:
    '<p>Build workflows on the Now Platform with ITSM, CSM, and HRSD modules for enterprise clients.</p>',
  company_logo: null,
}

describe('job-og-meta', () => {
  it('truncates long text', () => {
    expect(truncateText('hello world', 8)).toBe('hello w…')
  })

  it('strips HTML for descriptions', () => {
    expect(stripHtmlToPlain('<p>Hello <strong>team</strong></p>')).toBe(
      'Hello team'
    )
  })

  it('builds OG title and chips', () => {
    expect(jobOgTitle(sampleJob)).toBe('ServiceNow Developer · Beonely')
    expect(jobOgMetaChips(sampleJob)).toEqual([
      'full time',
      'remote',
      'Featured',
    ])
  })

  it('prefers description text when long enough', () => {
    const desc = jobOgDescription(sampleJob)
    expect(desc).toContain('Build workflows')
  })
})
