import { useNavigate, useSearch } from '@tanstack/react-router'

export type PeekSearchValue = string | null

/**
 * URL-search-driven open state for a Notion-style peek panel.
 *
 * Reads `?<key>=<id>` from the current route's search (non-strict so it works on
 * any route) and returns a setter that merges the value into the URL. Setting
 * `null` clears the param. Keeping peek state in the URL makes peeks shareable
 * and dismissable via the browser back button.
 *
 * Note: routes that validate their search with a strict schema (e.g. zod) must
 * include `<key>` as an optional field, otherwise the param is stripped.
 */
export function usePeekSearch(key: string) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const raw = search[key]
  const value: PeekSearchValue =
    typeof raw === 'string' && raw.length > 0 ? raw : null

  const setValue = (next: PeekSearchValue) => {
    void navigate({
      search: ((prev: Record<string, unknown>) => ({
        ...prev,
        [key]: next && next.length > 0 ? next : undefined,
      })) as never,
    })
  }

  return [value, setValue] as const
}
