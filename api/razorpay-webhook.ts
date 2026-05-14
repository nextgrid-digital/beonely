import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Prefer client + `/api/verify-payment` with signature validation. */
export default function handler (_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    message:
      'Webhook not used in this MVP; Razorpay payment is confirmed via /api/verify-payment.',
  })
}
