import { useEffect, useId, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Globe, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { publicPortfolioUrl } from '@/lib/candidate/portfolio-share-url'
import { slugifyHandle, validateHandle } from '@/lib/candidate/portfolio-slug'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PortfolioShareMenu } from '@/features/candidate/portfolio-share-menu'

export type PortfolioPublishPanelProps = {
  userId: string
  profileRow: {
    public_slug?: string | null
    is_public?: boolean | null
    portfolio_published_at?: string | null
  } | null
  /** Display name used to seed a default handle and the share card. */
  name: string
  headline: string
}

export function PortfolioPublishPanel({
  userId,
  profileRow,
  name,
  headline,
}: PortfolioPublishPanelProps) {
  const qc = useQueryClient()
  const handleInputId = useId()
  const publishSwitchId = useId()

  const savedSlug = profileRow?.public_slug?.trim() ?? ''
  const savedPublic = Boolean(profileRow?.is_public)

  const [handle, setHandle] = useState(
    () => savedSlug || slugifyHandle(name)
  )
  const [isPublic, setIsPublic] = useState(savedPublic)

  // Keep local state in sync if the saved profile changes (e.g. after refetch).
  useEffect(() => {
    setHandle(savedSlug || slugifyHandle(name))
    setIsPublic(savedPublic)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed from saved row only
  }, [savedSlug, savedPublic])

  const formatError = validateHandle(handle)
  const isUnchangedSaved = handle.trim().toLowerCase() === savedSlug.toLowerCase()
  const debouncedHandle = useDebouncedValue(handle.trim().toLowerCase(), 400)

  const availabilityQuery = useQuery({
    queryKey: ['portfolio-handle-available', debouncedHandle],
    enabled:
      getSupabaseConfigured() &&
      !formatError &&
      debouncedHandle.length > 0 &&
      debouncedHandle !== savedSlug.toLowerCase(),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb.rpc('is_portfolio_slug_available', {
        p_slug: debouncedHandle,
      })
      if (error) throw error
      return Boolean(data)
    },
  })

  const isAvailable = isUnchangedSaved
    ? true
    : (availabilityQuery.data ?? null)

  const canPublish = name.trim().length > 0 && headline.trim().length > 0

  const save = useMutation({
    mutationFn: async (next: { slug: string; makePublic: boolean }) => {
      const sb = getSupabaseBrowserClient()
      const publishedAt = next.makePublic
        ? (profileRow?.portfolio_published_at ?? new Date().toISOString())
        : (profileRow?.portfolio_published_at ?? null)
      const { error } = await sb
        .from('job_seeker_profiles')
        .update({
          public_slug: next.slug,
          is_public: next.makePublic,
          portfolio_published_at: publishedAt,
        })
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_data, next) => {
      void qc.invalidateQueries({ queryKey: ['job-seeker-profile', userId] })
      toast.success(next.makePublic ? 'Portfolio published' : 'Portfolio saved')
    },
    onError: (e) => {
      const message = (e as { message?: string }).message ?? ''
      if (/duplicate|unique/i.test(message)) {
        toast.error('That handle is already taken.')
      } else if (/job_seeker_profiles_public_slug_format/i.test(message)) {
        toast.error('Handle format is invalid.')
      } else {
        toast.error('Could not save portfolio settings')
      }
    },
  })

  const blockingError = useMemo(() => {
    if (!profileRow) return 'Save your profile before publishing.'
    if (formatError) return formatError
    if (!isUnchangedSaved && availabilityQuery.isSuccess && isAvailable === false) {
      return 'That handle is taken. Try another.'
    }
    return null
  }, [
    profileRow,
    formatError,
    isUnchangedSaved,
    availabilityQuery.isSuccess,
    isAvailable,
  ])

  const onTogglePublish = (next: boolean) => {
    if (next && (blockingError || !canPublish)) {
      toast.error(
        !canPublish
          ? 'Add your name and role before publishing.'
          : (blockingError ?? 'Fix the handle first.')
      )
      return
    }
    setIsPublic(next)
    save.mutate({ slug: handle.trim().toLowerCase(), makePublic: next })
  }

  const onSaveHandle = () => {
    if (blockingError) {
      toast.error(blockingError)
      return
    }
    save.mutate({ slug: handle.trim().toLowerCase(), makePublic: isPublic })
  }

  const liveUrl = publicPortfolioUrl(savedSlug || handle.trim().toLowerCase())

  return (
    <section className='mx-auto mb-6 max-w-3xl rounded-xl border bg-card p-4 text-card-foreground sm:p-5'>
      <div className='flex items-start gap-3'>
        <Globe className='mt-0.5 size-5 shrink-0 text-muted-foreground' aria-hidden />
        <div className='min-w-0 flex-1'>
          <h2 className='text-sm font-semibold'>Public portfolio</h2>
          <p className='text-sm text-muted-foreground'>
            Share a public link to your profile. Your email and phone stay
            private.
          </p>

          <div className='mt-4 space-y-1.5'>
            <Label htmlFor={handleInputId}>Your link</Label>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <div className='flex min-w-0 flex-1 items-center rounded-md border bg-background pl-3 focus-within:ring-2 focus-within:ring-ring'>
                <span className='shrink-0 text-sm text-muted-foreground'>
                  beonely.in/p/
                </span>
                <Input
                  id={handleInputId}
                  value={handle}
                  inputMode='url'
                  autoCapitalize='none'
                  autoCorrect='off'
                  spellCheck={false}
                  placeholder='your-name'
                  className='border-0 bg-transparent px-1 shadow-none focus-visible:ring-0'
                  onChange={(e) =>
                    setHandle(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                    )
                  }
                  aria-describedby={`${handleInputId}-status`}
                />
                <span className='px-2'>
                  {!formatError && !isUnchangedSaved && availabilityQuery.isFetching ? (
                    <Loader2 className='size-4 animate-spin text-muted-foreground' aria-hidden />
                  ) : null}
                  {!formatError && isAvailable === true && !isUnchangedSaved ? (
                    <Check className='size-4 text-emerald-600' aria-hidden />
                  ) : null}
                  {(formatError || isAvailable === false) && handle.length > 0 ? (
                    <X className='size-4 text-destructive' aria-hidden />
                  ) : null}
                </span>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='shrink-0'
                disabled={
                  save.isPending ||
                  isUnchangedSaved ||
                  Boolean(blockingError)
                }
                onClick={onSaveHandle}
              >
                {save.isPending ? 'Saving…' : 'Save link'}
              </Button>
            </div>
            <p
              id={`${handleInputId}-status`}
              className='min-h-4 text-xs text-muted-foreground'
            >
              {formatError
                ? formatError
                : isAvailable === false && !isUnchangedSaved
                  ? 'That handle is taken. Try another.'
                  : isAvailable === true && !isUnchangedSaved
                    ? 'Available'
                    : ''}
            </p>
          </div>

          <div className='mt-3 flex items-center justify-between gap-3 border-t pt-3'>
            <div className='min-w-0'>
              <Label htmlFor={publishSwitchId} className='cursor-pointer'>
                Publish portfolio
              </Label>
              <p className='text-xs text-muted-foreground'>
                {canPublish
                  ? 'Anyone with the link can view it.'
                  : 'Add your name and role to publish.'}
              </p>
            </div>
            <Switch
              id={publishSwitchId}
              checked={isPublic}
              disabled={save.isPending || (!isPublic && !canPublish)}
              onCheckedChange={onTogglePublish}
            />
          </div>

          {savedPublic && savedSlug ? (
            <div className='mt-3 flex flex-col gap-2 rounded-md bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between'>
              <a
                href={liveUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='min-w-0 truncate text-sm font-medium text-foreground hover:underline'
              >
                {liveUrl.replace(/^https?:\/\//, '')}
              </a>
              <PortfolioShareMenu
                handle={savedSlug}
                name={name}
                headline={headline}
                className='shrink-0'
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
