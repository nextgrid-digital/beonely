import { describe, expect, it } from 'vitest'
import {
  buildCanonicalApplyUrlSet,
  detectLinkedInClosedSignal,
} from './prune-linkedin-jobs'

describe('detectLinkedInClosedSignal', () => {
  it('flags hard-not-found status as closed', () => {
    expect(detectLinkedInClosedSignal({ status: 404, body: '' })).toEqual({
      closed: true,
      reason: 'http_404',
    })
  })

  it('flags known close-copy as closed', () => {
    const body = '<div>This job is no longer available. Please try other roles.</div>'
    expect(detectLinkedInClosedSignal({ status: 200, body })).toEqual({
      closed: true,
      reason: 'content_no_longer_available',
    })
  })

  it('keeps blocked responses open for later retry', () => {
    expect(detectLinkedInClosedSignal({ status: 429, body: 'rate limited' })).toEqual({
      closed: false,
      reason: 'blocked_429',
    })
  })

  it('keeps non-closed responses open', () => {
    expect(
      detectLinkedInClosedSignal({
        status: 200,
        body: '<html><body><h1>ServiceNow Developer</h1></body></html>',
      })
    ).toEqual({
      closed: false,
      reason: 'no_close_signal',
    })
  })
})

describe('buildCanonicalApplyUrlSet', () => {
  it('normalizes and dedupes linkedin apply urls', () => {
    const urls = buildCanonicalApplyUrlSet([
      {
        job_title: 'ServiceNow Developer',
        company_name: 'Acme',
        apply_url: 'https://linkedin.com/jobs/view/123?trk=abc',
        job_description: 'desc',
      },
      {
        job_title: 'ServiceNow Developer',
        company_name: 'Acme',
        apply_url: 'https://www.linkedin.com/jobs/view/123/',
        job_description: 'desc',
      },
    ])

    expect(Array.from(urls)).toEqual(['https://www.linkedin.com/jobs/view/123'])
  })
})
