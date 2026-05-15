import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

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
  className,
}: {
  companyName: string
  logoUrl?: string | null
  className?: string
}) {
  const url = logoUrl?.trim()
  const hasLogo = Boolean(url)

  return (
    <Avatar
      className={cn(
        'size-11 shrink-0 rounded-md border border-border/60 bg-muted/30',
        className
      )}
    >
      {hasLogo && (
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
