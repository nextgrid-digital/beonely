import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/context/auth-provider'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'
import {
  SignUpForm,
  type SignUpSuccessInfo,
} from '@/features/auth/sign-up/components/sign-up-form'
import type { ProfileRow } from '@/lib/supabase/database.types'

export type AuthModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  /** Initial tab when the dialog opens. */
  defaultTab?: 'signIn' | 'signUp'
  /** After sign-in or immediate post-sign-up session; profile from refreshed app profile. */
  onAuthComplete?: (profile: ProfileRow | null) => void
}

const DEFAULT_TITLE = 'Sign in'
const DEFAULT_DESCRIPTION =
  'Sign in or create an account to continue. Your email confirmation link will return you to sign in.'

function AuthModalBody ({
  defaultTab,
  onAuthComplete,
  onOpenChange,
}: {
  defaultTab: 'signIn' | 'signUp'
  onAuthComplete?: (profile: ProfileRow | null) => void
  onOpenChange: (open: boolean) => void
}) {
  const { refreshProfile } = useAuth()
  const [tab, setTab] = useState<'signIn' | 'signUp'>(defaultTab)
  const [prefillEmail, setPrefillEmail] = useState<string | undefined>()

  const onAuthCompleteRef = useRef(onAuthComplete)
  useEffect(() => {
    onAuthCompleteRef.current = onAuthComplete
  }, [onAuthComplete])

  const finishSignIn = useCallback(async () => {
    const profile = await refreshProfile()
    onAuthCompleteRef.current?.(profile)
    onOpenChange(false)
  }, [refreshProfile, onOpenChange])

  const handleSignUpSuccess = useCallback(
    async ({ email, hasSession }: SignUpSuccessInfo) => {
      if (hasSession) {
        const profile = await refreshProfile()
        onAuthCompleteRef.current?.(profile)
        onOpenChange(false)
        return
      }
      setPrefillEmail(email)
      setTab('signIn')
    },
    [refreshProfile, onOpenChange]
  )

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>(
        '[data-slot="dialog-content"] [data-slot="tabs-content"][data-state="active"] [data-slot="input"]'
      )
      root?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [tab])

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as 'signIn' | 'signUp')}
      className='gap-4'
    >
      <TabsList className='grid w-full grid-cols-2'>
        <TabsTrigger value='signIn'>Sign in</TabsTrigger>
        <TabsTrigger value='signUp'>Create account</TabsTrigger>
      </TabsList>
      <TabsContent value='signIn' className='mt-0'>
        <UserAuthForm onSuccess={finishSignIn} defaultEmail={prefillEmail} />
      </TabsContent>
      <TabsContent value='signUp' className='mt-0'>
        <SignUpForm onSuccess={handleSignUpSuccess} />
      </TabsContent>
    </Tabs>
  )
}

export function AuthModal ({
  open,
  onOpenChange,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  defaultTab = 'signIn',
  onAuthComplete,
}: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='gap-4 sm:max-w-md'
        overlayClassName='backdrop-blur-md'
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open ? (
          <AuthModalBody
            key={defaultTab}
            defaultTab={defaultTab}
            onAuthComplete={onAuthComplete}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
