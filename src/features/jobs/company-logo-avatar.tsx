import { getSupabaseUrl } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const LINKEDIN_LOGO_HOSTS = new Set(['media.licdn.com', 'static.licdn.com'])
const UUID_PATH_SEGMENT =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const JOB_LOGO_PATH = new RegExp(
  `^/storage/v1/object/public/job-logos/${UUID_PATH_SEGMENT}/${UUID_PATH_SEGMENT}/logo\\.jpg$`,
  'i'
)

function configuredSupabaseOrigin(): string | null {
  const configured = getSupabaseUrl()
  if (!configured) return null
  try {
    return new URL(configured).origin
  } catch {
    return null
  }
}

/**
 * Keep public logo rendering on app-owned Storage or the known LinkedIn import
 * origins. This prevents a recruiter-controlled URL from tracking visitors.
 */
export function trustedCompanyLogoUrl(
  value: string | null | undefined,
  options: { allowLocalPreview?: boolean } = {}
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (options.allowLocalPreview && trimmed.startsWith('blob:')) return trimmed

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return null
    if (LINKEDIN_LOGO_HOSTS.has(parsed.hostname)) return parsed.href

    const storageOrigin = configuredSupabaseOrigin()
    if (
      storageOrigin &&
      parsed.origin === storageOrigin &&
      JOB_LOGO_PATH.test(parsed.pathname)
    ) {
      return parsed.href
    }
  } catch {
    return null
  }

  return null
}

export function companyInitials(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return t.slice(0, 2).toUpperCase()
}

export function CompanyLogoAvatar({
  companyName,
  logoUrl,
  allowLocalPreview = false,
  className,
}: {
  companyName: string
  logoUrl?: string | null
  allowLocalPreview?: boolean
  className?: string
}) {
  const url = trustedCompanyLogoUrl(logoUrl, { allowLocalPreview })

  return (
    <Avatar
      className={cn(
        'size-11 shrink-0 rounded-md border border-border/60 bg-muted/30',
        className
      )}
    >
      {url && (
        <AvatarImage
          src={url}
          alt={`${companyName} logo`}
          className='object-cover'
          loading='lazy'
        />
      )}
      <AvatarFallback className='rounded-md bg-muted text-xs font-semibold text-muted-foreground uppercase'>
        {companyInitials(companyName)}
      </AvatarFallback>
    </Avatar>
  )
}
