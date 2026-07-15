import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { unsubscribeByToken } from './marketing-consent.js'

describe('marketing consent propagation', () => {
  it('uses a normalized exact email match when propagating unsubscribe', async () => {
    const candidateEq = vi.fn(async () => ({ error: null }))
    const recruiterEq = vi.fn(async () => ({ error: null }))
    let subscriberCalls = 0

    const from = vi.fn((table: string) => {
      if (table === 'email_subscribers') {
        subscriberCalls += 1
        if (subscriberCalls === 1) {
          return {
            select() {
              return this
            },
            eq() {
              return this
            },
            maybeSingle: vi.fn(async () => ({
              data: {
                id: 'sub-1',
                email: ' Mixed@Example.com ',
                unsubscribed_at: null,
              },
              error: null,
            })),
          }
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      if (table === 'job_seeker_profiles') {
        return { update: vi.fn(() => ({ eq: candidateEq })) }
      }
      if (table === 'recruiters') {
        return { update: vi.fn(() => ({ eq: recruiterEq })) }
      }
      throw new Error(`unexpected_table:${table}`)
    })

    const result = await unsubscribeByToken(
      { from } as unknown as SupabaseClient,
      'unsubscribe-token'
    )

    expect(result).toEqual({ ok: true, email: ' Mixed@Example.com ' })
    expect(candidateEq).toHaveBeenCalledWith('email', 'mixed@example.com')
    expect(recruiterEq).toHaveBeenCalledWith('email', 'mixed@example.com')
  })
})
