import type { User } from '@supabase/supabase-js'

export function displayNameFromUser (user: User): string {
  const meta = user.user_metadata as
    | { full_name?: string; name?: string }
    | undefined
  const email = user.email ?? ''
  return (
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta?.name === 'string' && meta.name.trim()) ||
    (email.includes('@') ? email.split('@')[0] : email) ||
    'Account'
  )
}

export function displayFromUser (user: User): {
  name: string
  email: string
  avatarUrl: string | undefined
  initials: string
} {
  const meta = user.user_metadata as
    | { full_name?: string; name?: string; avatar_url?: string }
    | undefined
  const email = user.email ?? ''
  const name = displayNameFromUser(user)
  const words = name.split(/\s+/).filter(Boolean)
  const initials =
    words.length >= 2
      ? `${words[0]![0]!}${words[1]![0]!}`.toUpperCase()
      : (name.slice(0, 2) || '?').toUpperCase()
  const avatarUrl =
    typeof meta?.avatar_url === 'string' && meta.avatar_url.trim()
      ? meta.avatar_url.trim()
      : undefined
  return { name, email, avatarUrl, initials }
}
