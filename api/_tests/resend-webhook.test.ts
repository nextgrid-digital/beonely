import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../resend-webhook.js'

const mocks = vi.hoisted(() => ({
  event: {} as Record<string, unknown>,
  rpc: vi.fn(),
  verify: vi.fn(),
}))

vi.mock('../_lib/raw-body.js', () => ({
  readRawBody: vi.fn(async () => '{"signed":true}'),
}))

vi.mock('../_lib/resend.js', () => ({
  verifyResendWebhook: mocks.verify,
}))

vi.mock('../_lib/supabase.js', () => ({
  tryGetServiceSupabase: vi.fn(() => ({
    ok: true,
    client: { rpc: mocks.rpc },
  })),
}))

const originalSecret = process.env.RESEND_WEBHOOK_SECRET

function response() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(value: unknown) {
      this.body = value
      return this
    },
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: unknown
  }
}

function request(): VercelRequest {
  return {
    method: 'POST',
    headers: {
      'svix-id': 'evt_1',
      'svix-timestamp': '1720000000',
      'svix-signature': 'v1,signature',
    },
  } as unknown as VercelRequest
}

describe('Resend webhook delivery events', () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test'
    mocks.rpc.mockReset()
    mocks.verify.mockReset()
    mocks.verify.mockImplementation(() => mocks.event)
    mocks.rpc.mockResolvedValue({
      data: { ok: true, replayed: false },
      error: null,
    })
  })

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET
    else process.env.RESEND_WEBHOOK_SECRET = originalSecret
  })

  it('records email.failed without suppressing a potentially valid address', async () => {
    mocks.event = {
      type: 'email.failed',
      created_at: '2026-07-11T10:00:00.000Z',
      data: {
        email_id: 'email_1',
        to: ['USER@EXAMPLE.COM'],
        failed: { reason: 'provider_failed' },
      },
    }
    const res = response()

    await handler(request(), res)

    expect(res.statusCode).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_resend_delivery_event',
      expect.objectContaining({
        p_status: 'failed',
        p_error_message: 'provider_failed',
        p_recipient_email: 'user@example.com',
        p_suppress_recipient: false,
      })
    )
  })

  it.each([
    ['email.complained', {}, 'complained'],
    [
      'email.suppressed',
      { suppressed: { message: 'on suppression list', type: 'Suppressed' } },
      'suppressed',
    ],
    [
      'email.bounced',
      { bounce: { message: 'mailbox missing', type: 'Permanent' } },
      'bounced',
    ],
  ])(
    'atomically suppresses recipients for %s',
    async (type, detail, status) => {
      mocks.event = {
        type,
        created_at: '2026-07-11T10:00:00.000Z',
        data: {
          email_id: 'email_1',
          to: ['USER@EXAMPLE.COM'],
          ...detail,
        },
      }
      const res = response()

      await handler(request(), res)

      expect(res.statusCode).toBe(200)
      expect(mocks.rpc).toHaveBeenCalledWith(
        'apply_resend_delivery_event',
        expect.objectContaining({
          p_status: status,
          p_recipient_email: 'user@example.com',
          p_suppress_recipient: true,
        })
      )
    }
  )

  it('does not suppress a recipient for a transient bounce', async () => {
    mocks.event = {
      type: 'email.bounced',
      created_at: '2026-07-11T10:00:00.000Z',
      data: {
        email_id: 'email_1',
        to: ['user@example.com'],
        bounce: { message: 'temporary failure', type: 'Transient' },
      },
    }
    const res = response()

    await handler(request(), res)

    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_resend_delivery_event',
      expect.objectContaining({ p_suppress_recipient: false })
    )
  })
})
