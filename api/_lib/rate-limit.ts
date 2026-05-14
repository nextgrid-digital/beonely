import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

function getLimiter () {
  if (ratelimit) return ratelimit
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const redis = new Redis({ url, token })
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'beonely:api',
  })
  return ratelimit
}

export async function rateLimitOrThrow (id: string): Promise<void> {
  const lim = getLimiter()
  if (!lim) return
  try {
    const { success } = await lim.limit(id)
    if (!success) {
      const err = new Error('rate_limited')
      ;(err as Error & { statusCode: number }).statusCode = 429
      throw err
    }
  } catch (e) {
    if ((e as Error & { statusCode?: number }).statusCode === 429) throw e
    // eslint-disable-next-line no-console
    console.warn('[rate-limit] Upstash error; allowing request:', e)
  }
}
