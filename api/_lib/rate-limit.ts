import crypto from 'node:crypto'
import { tryGetServiceSupabase } from './supabase.js'

export type RateLimitOptions = {
  /** Maximum requests allowed inside one fixed window. */
  limit?: number
  /** Fixed-window duration in seconds. */
  windowSeconds?: number
}

export class RateLimitError extends Error {
  readonly statusCode: 429 | 503
  readonly code: 'rate_limited' | 'rate_limit_unavailable'
  readonly retryAfterSeconds: number

  constructor(opts: {
    statusCode: 429 | 503
    code: 'rate_limited' | 'rate_limit_unavailable'
    retryAfterSeconds: number
  }) {
    super(opts.code)
    this.name = 'RateLimitError'
    this.statusCode = opts.statusCode
    this.code = opts.code
    this.retryAfterSeconds = opts.retryAfterSeconds
  }
}

type LocalWindow = { count: number; expiresAt: number }

const DEFAULT_LIMIT = 30
const DEFAULT_WINDOW_SECONDS = 60
const MAX_LOCAL_KEYS = 5_000
const localWindows = new Map<string, LocalWindow>()

function boundedPositiveInt(
  value: number | undefined,
  fallback: number,
  max: number
) {
  if (!Number.isInteger(value) || (value ?? 0) <= 0) return fallback
  return Math.min(value as number, max)
}

function productionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  )
}

function hashKey(id: string): string {
  return crypto.createHash('sha256').update(id, 'utf8').digest('hex')
}

function limited(retryAfterSeconds: number): never {
  throw new RateLimitError({
    statusCode: 429,
    code: 'rate_limited',
    retryAfterSeconds,
  })
}

function unavailable(retryAfterSeconds: number): never {
  throw new RateLimitError({
    statusCode: 503,
    code: 'rate_limit_unavailable',
    retryAfterSeconds,
  })
}

function consumeLocal(
  keyHash: string,
  limit: number,
  windowSeconds: number
): void {
  const now = Date.now()
  const existing = localWindows.get(keyHash)
  if (existing && existing.expiresAt > now) {
    existing.count += 1
    if (existing.count > limit) {
      limited(Math.max(1, Math.ceil((existing.expiresAt - now) / 1_000)))
    }
    return
  }

  if (localWindows.size >= MAX_LOCAL_KEYS) {
    for (const [key, value] of localWindows) {
      if (value.expiresAt <= now) localWindows.delete(key)
    }
  }
  if (localWindows.size >= MAX_LOCAL_KEYS && !localWindows.has(keyHash)) {
    unavailable(windowSeconds)
  }

  localWindows.set(keyHash, {
    count: 1,
    expiresAt: now + windowSeconds * 1_000,
  })
}

/**
 * Consume one API quota unit.
 *
 * Production uses the atomic `consume_api_rate_limit` Supabase RPC so limits are
 * shared across serverless instances. Local development and tests use a bounded
 * in-memory fallback. Production deliberately fails closed when the distributed
 * limiter is unavailable; set up the accompanying migration before deployment.
 */
export async function rateLimitOrThrow(
  id: string,
  options: RateLimitOptions = {}
): Promise<void> {
  const limit = boundedPositiveInt(options.limit, DEFAULT_LIMIT, 10_000)
  const windowSeconds = boundedPositiveInt(
    options.windowSeconds,
    DEFAULT_WINDOW_SECONDS,
    86_400
  )
  const keyHash = hashKey(id.trim() || 'unknown')
  const sbInit = tryGetServiceSupabase()

  if (sbInit.ok) {
    const { data, error } = await sbInit.client.rpc('consume_api_rate_limit', {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (!error && typeof data === 'boolean') {
      if (!data) limited(windowSeconds)
      return
    }

    if (productionRuntime()) unavailable(windowSeconds)
  } else if (productionRuntime()) {
    unavailable(windowSeconds)
  }

  consumeLocal(keyHash, limit, windowSeconds)
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError
}

/** Test-only reset for the process-local development fallback. */
export function resetLocalRateLimitsForTests(): void {
  localWindows.clear()
}
