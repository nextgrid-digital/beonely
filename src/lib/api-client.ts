/** Base URL for same-origin `/api/*` (Vercel). Local dev: run `vercel dev` on port 3000 with Vite proxy. */
export function apiBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  return ''
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  accessToken: string | undefined
): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? res.statusText)
  }
  return json
}
