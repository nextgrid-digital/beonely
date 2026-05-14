import type { Ratelimit } from '@upstash/ratelimit'

type LimiterState =
  | { kind: 'unset' }
  | { kind: 'none' }
  | { kind: 'ready'; lim: Ratelimit }

let limiterState: LimiterState = { kind: 'unset' }

async function getLimiter (): Promise<Ratelimit | null> {
  if (limiterState.kind === 'ready') return limiterState.lim
  if (limiterState.kind === 'none') return null

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    limiterState = { kind: 'none' }
    return null
  }

  try {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ])
    const redis = new Redis({ url, token })
    const lim = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'beonely:api',
    })
    limiterState = { kind: 'ready', lim }
    return lim
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[rate-limit] failed to load Upstash; disabling limiter:', e)
    limiterState = { kind: 'none' }
    return null
  }
}

export async function rateLimitOrThrow (id: string): Promise<void> {
  const lim = await getLimiter()
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
