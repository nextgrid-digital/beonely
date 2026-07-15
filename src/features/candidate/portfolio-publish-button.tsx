import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { slugifyHandle } from '@/lib/candidate/portfolio-slug'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PortfolioShareMenu } from '@/features/candidate/portfolio-share-menu'

export type PortfolioPublishButtonProps = {
  userId: string
  profileRow: {
    public_slug?: string | null
    is_public?: boolean | null
    portfolio_published_at?: string | null
  } | null
  /** Display name used to seed the auto-generated handle and the share card. */
  name: string
  headline: string
  className?: string
}

export function PortfolioPublishButton({
  userId,
  profileRow,
  name,
  headline,
  className,
}: PortfolioPublishButtonProps) {
  const qc = useQueryClient()

  const savedSlug = profileRow?.public_slug?.trim() ?? ''
  const savedPublic = Boolean(profileRow?.is_public)

  const canPublish = useMemo(
    () =>
      Boolean(profileRow) &&
      name.trim().length > 0 &&
      headline.trim().length > 0,
    [profileRow, name, headline]
  )

  const publish = useMutation({
    mutationFn: async () => {
      const sb = getSupabaseBrowserClient()
      const slug = await resolveSlug(sb)
      const publishedAt =
        profileRow?.portfolio_published_at ?? new Date().toISOString()
      const { error } = await sb
        .from('job_seeker_profiles')
        .update({
          public_slug: slug,
          is_public: true,
          portfolio_published_at: publishedAt,
        })
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-seeker-profile', userId] })
      toast.success('Portfolio published')
    },
    onError: (e) => {
      const message = (e as { message?: string }).message ?? ''
      if (/duplicate|unique/i.test(message)) {
        toast.error('That handle is already taken. Try again.')
      } else if (/job_seeker_profiles_public_slug_format/i.test(message)) {
        toast.error('Could not generate a valid link.')
      } else {
        toast.error('Could not publish portfolio')
      }
    },
  })

  const unpublish = useMutation({
    mutationFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb
        .from('job_seeker_profiles')
        .update({ is_public: false })
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-seeker-profile', userId] })
      toast.success('Portfolio unpublished')
    },
    onError: () => {
      toast.error('Could not unpublish portfolio')
    },
  })

  // Resolve a unique handle on first publish; reuse the saved slug afterwards.
  async function resolveSlug(
    sb: ReturnType<typeof getSupabaseBrowserClient>
  ): Promise<string> {
    if (savedSlug) return savedSlug
    const base = (slugifyHandle(name) || 'profile').slice(0, 38)
    let candidate = base.length >= 3 ? base : `${base}-${userId.slice(0, 4)}`
    for (let i = 0; i < 5; i++) {
      const { data } = await sb.rpc('is_portfolio_slug_available', {
        p_slug: candidate,
      })
      if (data) return candidate
      candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`
    }
    // DB unique index on lower(public_slug) is the final guard.
    return candidate
  }

  if (savedPublic && savedSlug) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={unpublish.isPending}
          onClick={() => unpublish.mutate()}
        >
          {unpublish.isPending ? (
            <Loader2 className='size-3.5 animate-spin' aria-hidden />
          ) : null}
          {unpublish.isPending ? 'Unpublishing…' : 'Unpublish'}
        </Button>
        <PortfolioShareMenu
          handle={savedSlug}
          name={name}
          headline={headline}
        />
      </div>
    )
  }

  const publishButton = (
    <Button
      type='button'
      size='sm'
      disabled={!canPublish || publish.isPending}
      onClick={() => publish.mutate()}
    >
      {publish.isPending ? (
        <Loader2 className='size-3.5 animate-spin' aria-hidden />
      ) : (
        <Globe className='size-3.5' aria-hidden />
      )}
      {publish.isPending ? 'Publishing…' : 'Publish'}
    </Button>
  )

  if (!canPublish) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex', className)}>{publishButton}</span>
        </TooltipTrigger>
        <TooltipContent>Add your name and role to publish.</TooltipContent>
      </Tooltip>
    )
  }

  return <span className={cn('inline-flex', className)}>{publishButton}</span>
}
