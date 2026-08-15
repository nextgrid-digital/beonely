import { afterEach, describe, expect, it, vi } from 'vitest'
import { serverSiteOrigin } from './site-origin.js'

describe('serverSiteOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns only the validated HTTPS origin', () => {
    vi.stubEnv(
      'VITE_PUBLIC_SITE_URL',
      'https://jobs.example.com/a/path?query=value'
    )

    expect(serverSiteOrigin()).toBe('https://jobs.example.com')
  })

  it('allows HTTP only for local development', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'http://127.0.0.1:4173/a/path')
    expect(serverSiteOrigin()).toBe('http://127.0.0.1:4173')

    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'http://example.com')
    expect(serverSiteOrigin()).toBe('https://beonely.in')
  })

  it('falls back to the canonical production origin for malformed input', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'not a URL')

    expect(serverSiteOrigin()).toBe('https://beonely.in')
  })
})
