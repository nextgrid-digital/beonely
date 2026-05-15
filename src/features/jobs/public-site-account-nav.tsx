import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Briefcase, ChevronDown, LayoutDashboard, LogOut } from 'lucide-react'
import { displayFromUser } from '@/lib/auth/display-name'
import { getPostAuthPath } from '@/lib/auth/post-auth-path'
import {
  PROFILE_AVATAR_PLACEHOLDER_URL,
  resumeStructuredEnvelopeSchema,
} from '@/lib/candidate/resume-structured-schema'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { usePublicSiteAuth } from '@/features/jobs/public-site-auth-provider'
import { useState } from 'react'

function candidateAvatarFromResumeRow(
  row: { resume_structured: unknown } | null | undefined
): string | undefined {
  if (!row) return undefined
  const parsed = resumeStructuredEnvelopeSchema.safeParse(row.resume_structured)
  if (!parsed.success) return undefined
  const url = parsed.data.general.avatar?.trim()
  if (!url || url === PROFILE_AVATAR_PLACEHOLDER_URL) return undefined
  if (url.includes('placehold.co')) return undefined
  return url
}

export function PublicSiteAccountNav() {
  const { user, loading, profile } = useAuth()
  const { requireAuthForPostJob, openCandidateAuthModal } = usePublicSiteAuth()
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)

  const candidateAvatarQuery = useQuery({
    queryKey: ['job-seeker-profile', user?.id ?? ''],
    enabled:
      Boolean(user?.id) &&
      profile?.role === 'candidate' &&
      getSupabaseConfigured(),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const uid = user!.id
      const { data, error } = await sb
        .from('job_seeker_profiles')
        .select('resume_structured')
        .eq('user_id', uid)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  if (loading) {
    return (
      <div className='flex items-center gap-3'>
        <div
          className='h-8 w-20 animate-pulse rounded-md bg-muted'
          aria-hidden
        />
        <div
          className='h-8 w-24 animate-pulse rounded-md bg-muted'
          aria-hidden
        />
      </div>
    )
  }

  if (user) {
    const {
      name,
      email,
      avatarUrl: metadataAvatarUrl,
      initials,
    } = displayFromUser(user)
    const resumeAvatar = candidateAvatarFromResumeRow(candidateAvatarQuery.data)
    const avatarUrl = resumeAvatar ?? metadataAvatarUrl

    return (
      <>
        <div className='flex items-center gap-2'>
          {(profile?.role === 'recruiter' || profile?.role === 'admin') && (
            <Button size='sm' type='button' onClick={requireAuthForPostJob}>
              Post a Job
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='w-fit gap-2 rounded-full pr-3 !pl-0'
                aria-label='User menu'
              >
                <Avatar className='h-7 w-7'>
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={name} />
                  ) : null}
                  <AvatarFallback className='text-xs'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown
                  className='size-4 shrink-0 opacity-60'
                  aria-hidden
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel className='font-normal'>
                <span className='truncate text-xs text-muted-foreground'>
                  {email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  to={getPostAuthPath(profile)}
                  className='flex items-center gap-2'
                >
                  <LayoutDashboard className='size-4 shrink-0' />
                  Profile
                </Link>
              </DropdownMenuItem>
              {(profile?.role === 'recruiter' || profile?.role === 'admin') && (
                <DropdownMenuItem asChild>
                  <Link to='/recruiter' className='flex items-center gap-2'>
                    <Briefcase className='size-4 shrink-0' />
                    Recruiter
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                className='flex items-center gap-2'
                onClick={() => setSignOutDialogOpen(true)}
              >
                <LogOut className='size-4 shrink-0' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SignOutDialog
          open={signOutDialogOpen}
          onOpenChange={setSignOutDialogOpen}
        />
      </>
    )
  }

  return (
    <div className='flex items-center justify-end gap-x-3 text-sm'>
      <button
        type='button'
        className='text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
        onClick={openCandidateAuthModal}
      >
        Sign in
      </button>
      <Button size='sm' type='button' onClick={requireAuthForPostJob}>
        Post a Job
      </Button>
    </div>
  )
}
