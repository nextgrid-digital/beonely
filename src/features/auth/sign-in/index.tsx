import { useLayoutEffect } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import {
  signInCardDescription,
  signInCardTitle,
} from '@/lib/auth/sign-in-intent'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect, intent } = useSearch({ from: '/(auth)/sign-in' })

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.location.hash.slice(1)
    if (!raw) return
    const type = new URLSearchParams(raw).get('type')
    if (type !== 'recovery') return
    window.location.replace(
      `${window.location.origin}/reset-password${window.location.hash}`
    )
  }, [])

  const title = intent === undefined ? 'Sign in' : signInCardTitle(intent)

  return (
    <AuthLayout>
      <Card className='w-full gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>{title}</CardTitle>
          <CardDescription>
            {intent === undefined ? (
              <>
                Enter your email and password below to log into your account.
                Don&apos;t have an account?{' '}
                <Link
                  to='/sign-up'
                  className='text-nowrap underline underline-offset-4 hover:text-primary'
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                {signInCardDescription(intent)}{' '}
                <Link
                  to='/sign-up'
                  search={{ intent }}
                  className='text-nowrap underline underline-offset-4 hover:text-primary'
                >
                  Sign up
                </Link>
                {' · '}
                <Link
                  to='/sign-in'
                  search={redirect ? { redirect } : {}}
                  className='text-nowrap underline underline-offset-4 hover:text-primary'
                >
                  Not this flow?
                </Link>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='px-2 text-center text-sm text-muted-foreground sm:px-8'>
            By clicking sign in, you agree to our{' '}
            <a
              href='/terms'
              className='underline underline-offset-4 hover:text-primary'
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href='/privacy'
              className='underline underline-offset-4 hover:text-primary'
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
