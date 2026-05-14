/**
 * API rate limiting is intentionally a no-op here.
 * `import('@upstash/ratelimit')` was still bundled into `/api/*` (~1MB+), which often
 * caused Vercel cold-start failures (FUNCTION_INVOCATION_FAILED) before any JSON response.
 * Re-introduce limits via Vercel WAF, Edge Middleware, or a tiny REST call to Upstash
 * without pulling the full SDK into this bundle.
 */
export async function rateLimitOrThrow (_id: string): Promise<void> {}
