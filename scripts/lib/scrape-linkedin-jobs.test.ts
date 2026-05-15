// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import {
  canonicalLinkedInApplyUrl,
  extractJobIdsFromSearchHtml,
  extractLinkedInJobId,
  isIndiaOrIndiaRemoteJob,
  isServiceNowRelated,
  normalizeEmploymentType,
  normalizeExperienceLevel,
  normalizeJobType,
  normalizeWorkMode,
  parseLinkedInJobDetailHtml,
  scrapeLinkedInJobs,
  type LinkedInScrapeConfig,
} from './scrape-linkedin-jobs'

function mockResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html',
    },
  })
}

const baseConfig: LinkedInScrapeConfig = {
  searchTerms: ['ServiceNow Developer India'],
  location: 'India',
  maxPages: 1,
  pageSize: 25,
  timeoutMs: 5_000,
  delayMs: 0,
  retryMax: 1,
  userAgent: 'test-agent',
}

describe('extractLinkedInJobId', () => {
  it('extracts job ids from linkedin urls and params', () => {
    expect(extractLinkedInJobId('https://www.linkedin.com/jobs/view/1234567890')).toBe('1234567890')
    expect(extractLinkedInJobId('/jobs/view/servicenow-developer-1234567890?trk=abc')).toBe('1234567890')
    expect(extractLinkedInJobId('https://www.linkedin.com/jobs/search/?currentJobId=9876543210')).toBe(
      '9876543210'
    )
  })
})

describe('canonicalLinkedInApplyUrl', () => {
  it('normalizes to the canonical linkedin job view url', () => {
    expect(canonicalLinkedInApplyUrl('https://linkedin.com/jobs/view/123456?trk=abc')).toBe(
      'https://www.linkedin.com/jobs/view/123456'
    )
  })
})

describe('extractJobIdsFromSearchHtml', () => {
  it('extracts and deduplicates ids from search html', () => {
    const html = `
      <a href="/jobs/view/1111111111">Job 1</a>
      <a href="https://www.linkedin.com/jobs/view/1111111111?trk=x">Duplicate</a>
      <a href="/jobs/search/?currentJobId=2222222222">Job 2</a>
    `
    expect(extractJobIdsFromSearchHtml(html)).toEqual(['1111111111', '2222222222'])
  })
})

describe('normalizers', () => {
  it('maps enum-friendly values', () => {
    expect(normalizeEmploymentType('6 months contract')).toBe('contract')
    expect(normalizeExperienceLevel('Senior ServiceNow Developer')).toBe('senior')
    expect(normalizeWorkMode('Hybrid, Bengaluru')).toBe('hybrid')
    expect(normalizeJobType('ServiceNow Architect')).toBe('architect')
  })
})

describe('filters', () => {
  it('detects servicenow relevance and india market targeting', () => {
    expect(isServiceNowRelated('ServiceNow ITSM Developer role')).toBe(true)
    expect(isServiceNowRelated('General Java Developer role')).toBe(false)

    expect(
      isIndiaOrIndiaRemoteJob({
        location: 'Bengaluru, Karnataka, India',
        description: 'ServiceNow role',
        workMode: 'onsite',
      })
    ).toBe(true)

    expect(
      isIndiaOrIndiaRemoteJob({
        location: 'Remote',
        description: 'Remote role - US only',
        workMode: 'remote',
      })
    ).toBe(false)
  })
})

describe('parseLinkedInJobDetailHtml', () => {
  it('parses title/company/location/full description from json-ld', () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "ServiceNow Developer",
        "description": "<p>Build workflows</p><ul><li>ITSM</li></ul>",
        "employmentType": "FULL_TIME",
        "url": "https://www.linkedin.com/jobs/view/3333333333",
        "hiringOrganization": {"name": "Acme Corp"},
        "jobLocation": [{"address": {"addressLocality": "Pune", "addressCountry": "IN"}}]
      }
      </script>
    `

    const parsed = parseLinkedInJobDetailHtml('3333333333', html)
    expect(parsed).toBeTruthy()
    expect(parsed?.jobTitle).toBe('ServiceNow Developer')
    expect(parsed?.companyName).toBe('Acme Corp')
    expect(parsed?.location).toContain('Pune')
    expect(parsed?.jobDescription).toContain('Build workflows')
    expect(parsed?.jobDescription).toContain('ITSM')
  })
})

describe('scrapeLinkedInJobs', () => {
  it('deduplicates and keeps only valid servicenow jobs', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input)

      if (url.includes('seeMoreJobPostings')) {
        return mockResponse(`
          <a href="/jobs/view/1111111111">A</a>
          <a href="/jobs/view/1111111111?trk=x">A dup</a>
          <a href="/jobs/view/2222222222">B</a>
        `)
      }

      if (url.includes('jobPosting/1111111111')) {
        return mockResponse(`
          <script type="application/ld+json">
          {
            "@type":"JobPosting",
            "title":"ServiceNow ITSM Developer",
            "description":"<p>ServiceNow ITSM role in India</p>",
            "employmentType":"FULL_TIME",
            "url":"https://www.linkedin.com/jobs/view/1111111111",
            "hiringOrganization":{"name":"Alpha"},
            "jobLocation":[{"address":{"addressLocality":"Bengaluru","addressCountry":"IN"}}]
          }
          </script>
        `)
      }

      if (url.includes('jobPosting/2222222222')) {
        return mockResponse(`
          <script type="application/ld+json">
          {
            "@type":"JobPosting",
            "title":"Frontend Engineer",
            "description":"<p>React role in Berlin</p>",
            "employmentType":"FULL_TIME",
            "url":"https://www.linkedin.com/jobs/view/2222222222",
            "hiringOrganization":{"name":"Beta"},
            "jobLocation":[{"address":{"addressLocality":"Berlin","addressCountry":"DE"}}]
          }
          </script>
        `)
      }

      return mockResponse('', 404)
    })

    const result = await scrapeLinkedInJobs(baseConfig, {
      fetchImpl: fetchMock,
      logger: console,
    })

    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0].external_id).toBe('linkedin-1111111111')
    expect(result.summary.uniqueJobIds).toBe(2)
    expect(result.summary.jobsKept).toBe(1)
    expect(result.summary.filteredOut).toBeGreaterThanOrEqual(1)
  })

  it('retries transient failures and succeeds', async () => {
    let searchAttempts = 0
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input)
      if (url.includes('seeMoreJobPostings')) {
        searchAttempts += 1
        if (searchAttempts === 1) {
          throw new Error('temporary network error')
        }
        return mockResponse('<a href="/jobs/view/4444444444">A</a>')
      }

      if (url.includes('jobPosting/4444444444')) {
        return mockResponse(`
          <script type="application/ld+json">
          {
            "@type":"JobPosting",
            "title":"ServiceNow Consultant",
            "description":"<p>ServiceNow CSM role, Remote India</p>",
            "employmentType":"CONTRACT",
            "url":"https://www.linkedin.com/jobs/view/4444444444",
            "hiringOrganization":{"name":"Gamma"},
            "jobLocation":[{"address":{"addressLocality":"Remote","addressCountry":"IN"}}]
          }
          </script>
        `)
      }

      return mockResponse('', 404)
    })

    const result = await scrapeLinkedInJobs(baseConfig, {
      fetchImpl: fetchMock,
      logger: console,
    })

    expect(searchAttempts).toBe(2)
    expect(result.jobs).toHaveLength(1)
    expect(result.summary.failed).toBe(0)
  })
})
