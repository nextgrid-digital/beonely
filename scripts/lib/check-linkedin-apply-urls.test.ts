import { describe, expect, it, vi } from 'vitest'
import { checkLinkedInApplyUrl } from './check-linkedin-apply-urls'

const url = 'https://www.linkedin.com/jobs/view/123'

describe('LinkedIn liveness checks', () => {
  it('never fetches untrusted database URLs', async () => {
    const fetchImpl = vi.fn()
    expect(
      await checkLinkedInApplyUrl('http://127.0.0.1/private', { fetchImpl })
    ).toMatchObject({ live: true, reason: 'invalid_url' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('does not follow redirects off the allowed host or expire redirected jobs', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: 'http://127.0.0.1/private' },
        })
      )
    expect(await checkLinkedInApplyUrl(url, { fetchImpl })).toMatchObject({
      live: true,
      reason: 'http_error',
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ redirect: 'manual' })
    )
  })

  it.each([403, 429, 500])(
    'preserves jobs on an inconclusive HTTP %s',
    async (status) => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(new Response('Error', { status }))
      expect(await checkLinkedInApplyUrl(url, { fetchImpl })).toMatchObject({
        live: true,
        reason: 'http_error',
      })
    }
  )

  it.each([404, 410])(
    'expires an unavailable job on HTTP %s',
    async (status) => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(new Response(null, { status }))
      expect(await checkLinkedInApplyUrl(url, { fetchImpl })).toMatchObject({
        live: false,
        reason: 'gone',
      })
    }
  )

  it('expires an explicitly closed posting', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response('<p>No longer accepting applications</p>')
      )
    expect(await checkLinkedInApplyUrl(url, { fetchImpl })).toMatchObject({
      live: false,
      reason: 'closed',
    })
  })
})
