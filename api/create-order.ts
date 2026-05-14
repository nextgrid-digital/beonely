import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Thin entry so a dependency load failure still returns JSON (not Vercel’s HTML
 * FUNCTION_INVOCATION_FAILED). Heavy imports live in `./_lib/handlers/create-order-run`.
 */
export default async function handler (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    const { runCreateOrder } = await import('./_lib/handlers/create-order-run.js')
    await runCreateOrder(req, res)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[create-order] module or fatal error', e)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'create_order_load_failed',
        message: String((e as Error)?.message ?? e).slice(0, 400),
      })
    }
  }
}
