export async function verifyTurnstileToken(
  token: string | undefined,
  opts: { expectedAction?: string; remoteIp?: string } = {}
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return true
  const normalizedToken = token?.trim()
  if (!normalizedToken || normalizedToken.length > 2_048) return false
  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', normalizedToken)
  if (opts.remoteIp && opts.remoteIp !== 'unknown') {
    body.set('remoteip', opts.remoteIp)
  }
  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(7_000),
      }
    )
    if (!res.ok) return false
    const json = (await res.json()) as {
      success?: boolean
      action?: string
    }
    return Boolean(
      json.success &&
      (!opts.expectedAction || json.action === opts.expectedAction)
    )
  } catch {
    return false
  }
}
