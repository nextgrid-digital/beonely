import type { VercelRequest } from '@vercel/node'
import { describe, expect, it } from 'vitest'
import { readJsonObjectBody } from './request-json-body.js'

function request(body: unknown, contentLength?: string): VercelRequest {
  return {
    body,
    headers: contentLength ? { 'content-length': contentLength } : {},
  } as VercelRequest
}

describe('readJsonObjectBody', () => {
  it('accepts a small pre-parsed object', () => {
    expect(readJsonObjectBody(request({ ok: true }), 64)).toEqual({
      ok: true,
      value: { ok: true },
    })
  })

  it('parses a bounded JSON string', () => {
    expect(readJsonObjectBody(request('{"ok":true}'), 64)).toEqual({
      ok: true,
      value: { ok: true },
    })
  })

  it('rejects malformed JSON', () => {
    expect(readJsonObjectBody(request('{'), 64)).toEqual({ ok: false })
  })

  it('rejects an oversized declared body before parsing', () => {
    expect(readJsonObjectBody(request('{}', '65'), 64)).toEqual({ ok: false })
  })

  it('rejects oversized strings and pre-parsed bodies', () => {
    expect(
      readJsonObjectBody(
        request(JSON.stringify({ value: 'x'.repeat(80) })),
        64
      )
    ).toEqual({ ok: false })
    expect(readJsonObjectBody(request({ value: 'x'.repeat(80) }), 64)).toEqual({
      ok: false,
    })
  })
})
