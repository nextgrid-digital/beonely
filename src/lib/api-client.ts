/** Base URL for same-origin `/api/*` (Vercel). Local dev: `pnpm dev:local` or `pnpm dev:api` on 127.0.0.1:3000 with Vite proxy. */
export function apiBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  return ''
}

function vercelFunctionCrashHint(path: string, rawText: string): string {
  const t = rawText.slice(0, 400)
  if (
    t.includes('FUNCTION_INVOCATION_FAILED') ||
    t.includes('A server error has occurred') ||
    /<\s*!?\s*DOCTYPE\s+html/i.test(t)
  ) {
    return ` Vercel returned an HTML error page instead of JSON — the ${path} serverless function likely crashed on startup or before sending a response. Open Vercel → your project → Logs (filter ${path}). Typical fix: set SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY), RAZORPAY_KEY_ID, and RAZORPAY_KEY_SECRET for Production, then redeploy. See docs/vercel-environment.md.`
  }
  return ''
}

function parseApiResponseBody(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  return JSON.parse(trimmed) as unknown
}

function proxyHintMessage(status: number): string {
  if (status !== 502 && status !== 504) return ''
  return ' For local dev run `pnpm dev:local`, or `pnpm dev:api` (127.0.0.1:3000) with `pnpm dev`.'
}

const API_POST_TIMEOUT_MS = 30_000

export async function apiPost<T>(
  path: string,
  body: unknown,
  accessToken: string | undefined
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_POST_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${API_POST_TIMEOUT_MS / 1000}s. For local dev, run \`pnpm dev:local\` (Vite + API), or \`pnpm dev:api\` in a second terminal (listens on 127.0.0.1:3000) with \`pnpm dev\`.`
      )
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }

  const rawText = await res.text()
  let parsed: unknown
  try {
    parsed = parseApiResponseBody(rawText)
  } catch {
    const hint =
      vercelFunctionCrashHint(path, rawText) + proxyHintMessage(res.status)
    throw new Error(
      `Invalid JSON from server (${res.status}).${hint} Body: ${rawText.slice(0, 160)}`
    )
  }

  if (!res.ok) {
    const fromJson =
      parsed &&
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as { error: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : null
    const hint = proxyHintMessage(res.status)
    throw new Error(
      fromJson ??
        (parsed === undefined && (res.status === 502 || res.status === 504)
          ? `Request failed (${res.status}). Empty response — is the API running on port 3000?${hint}`
          : `Request failed (${res.status})${rawText.trim() ? `: ${rawText.slice(0, 200)}` : ''}${hint}`)
    )
  }

  if (parsed === undefined) {
    throw new Error('Empty response from server')
  }

  return parsed as T
}
