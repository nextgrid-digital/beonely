import { describe, expect, it, vi } from 'vitest'
import {
  jobOgImageUrl,
  jobShareMessage,
  jobShareTitle,
  publicJobUrl,
  publicSiteOrigin,
} from '@/lib/jobs/job-share-url'

describe('job-share-url', () => {
  it('builds public job URL from env origin', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://beonely.example.com')
    expect(publicSiteOrigin()).toBe('https://beonely.example.com')
    expect(publicJobUrl('senior-dev-bengaluru')).toBe(
      'https://beonely.example.com/jobs/senior-dev-bengaluru'
    )
    expect(jobOgImageUrl('senior-dev-bengaluru')).toBe(
      'https://beonely.example.com/api/og/job?slug=senior-dev-bengaluru'
    )
    vi.unstubAllEnvs()
  })

  it('formats share message and title', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://beonely.example.com')
    const job = {
      job_title: 'ServiceNow Developer',
      company_name: 'Acme',
      location: 'Remote India',
      job_slug: 'acme-dev',
    }
    expect(jobShareTitle(job)).toBe('ServiceNow Developer · Acme')
    expect(jobShareMessage(job)).toContain('ServiceNow Developer at Acme')
    expect(jobShareMessage(job)).toContain('Remote India')
    expect(jobShareMessage(job)).toContain('/jobs/acme-dev')
    vi.unstubAllEnvs()
  })
})
