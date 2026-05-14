export async function verifyTurnstileToken (token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false
  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body }
  )
  const json = (await res.json()) as { success?: boolean }
  return Boolean(json.success)
}
