import { afterEach, describe, expect, it } from 'vitest'
import {
  sameOriginReferrerPath,
  sanitizeRedirectPath,
} from './redirect-path'

function setDocumentReferrer(referrer: string) {
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    value: referrer,
  })
}

describe('sanitizeRedirectPath', () => {
  it('keeps in-app paths', () => {
    expect(sanitizeRedirectPath('/jobs/test?source=hero')).toBe(
      '/jobs/test?source=hero'
    )
  })

  it('rejects external or malformed targets', () => {
    expect(sanitizeRedirectPath('https://example.com')).toBeUndefined()
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBeUndefined()
    expect(sanitizeRedirectPath(undefined)).toBeUndefined()
  })
})

afterEach(() => {
  setDocumentReferrer('')
})

describe('sameOriginReferrerPath', () => {
  it('returns the path for same-origin referrers', () => {
    setDocumentReferrer(
      `${window.location.origin}/jobs/servicenow-dev?source=hero`
    )

    expect(sameOriginReferrerPath()).toBe('/jobs/servicenow-dev?source=hero')
  })

  it('ignores cross-origin referrers', () => {
    setDocumentReferrer('https://beonely.vercel.app/jobs/servicenow-dev')

    expect(sameOriginReferrerPath()).toBeUndefined()
  })
})
