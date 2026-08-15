import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL(
    '../../supabase/migrations/20260710220000_payment_lifecycle_hardening.sql',
    import.meta.url
  ),
  'utf8'
)

function fulfillmentRpc(): string {
  const start = migration.indexOf(
    'CREATE OR REPLACE FUNCTION public.fulfill_razorpay_payment_v2('
  )
  const end = migration.indexOf(
    'REVOKE ALL ON FUNCTION public.fulfill_razorpay_payment_v2',
    start
  )
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return migration.slice(start, end)
}

function between(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

function expectCaptureRecordedForReview(block: string): void {
  expect(block).toContain("WHEN status = 'refunded'")
  expect(block).toContain("ELSE 'paid'::public.payment_status")
  expect(block).toContain(
    'paid_at = COALESCE(paid_at, normalized_paid_at)'
  )
  expect(block).toContain('requires_manual_review = true')
  expect(block).not.toContain('entitlement_applied_at = now()')
}

describe('payment lifecycle migration capture invariants', () => {
  it('records a disabled-recruiter capture without granting entitlement', () => {
    const rpc = fulfillmentRpc()
    const replay = rpc.indexOf(
      'IF payment.razorpay_payment_id = p_payment_id AND payment.paid_at IS NOT NULL THEN'
    )
    const disabled = rpc.indexOf('ELSIF recruiter.disabled THEN')
    expect(replay).toBeGreaterThanOrEqual(0)
    expect(disabled).toBeGreaterThan(replay)

    const block = between(
      rpc,
      'ELSIF recruiter.disabled THEN',
      "ELSIF payment.status <> 'unpaid' THEN"
    )
    expectCaptureRecordedForReview(block)
    expect(block).toContain(
      "entitlement_withheld_reason = 'recruiter_disabled_at_capture'"
    )
    expect(block).toContain(
      'razorpay_payment_id = COALESCE(razorpay_payment_id, p_payment_id)'
    )
    expect(block).not.toContain('UPDATE public.jobs')
  })

  it('keeps reused and closed captures visible to reconciliation', () => {
    const rpc = fulfillmentRpc()
    const reusedSection = rpc.slice(rpc.indexOf('SELECT id INTO existing_payment'))
    const reused = between(
      reusedSection,
      'IF FOUND THEN',
      'ELSIF recruiter.disabled THEN'
    )
    expectCaptureRecordedForReview(reused)
    expect(reused).toContain("risk_status = 'provider_payment_reused'")
    expect(reused).not.toContain('razorpay_payment_id = p_payment_id')

    const closed = between(
      rpc,
      "ELSIF payment.status <> 'unpaid' THEN",
      "ELSIF payment.checkout_expires_at <= now() - interval '5 minutes' THEN"
    )
    expectCaptureRecordedForReview(closed)
    expect(closed).toContain("risk_status = 'capture_for_closed_checkout'")
    expect(closed).toContain(
      'razorpay_payment_id = COALESCE(razorpay_payment_id, p_payment_id)'
    )
  })
})
