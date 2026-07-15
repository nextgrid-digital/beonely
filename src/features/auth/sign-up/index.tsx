import { Link, useSearch } from '@tanstack/react-router'
import {
  signUpCardDescription,
  signUpCardTitle,
} from '@/lib/auth/sign-in-intent'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { intent, redirect } = useSearch({ from: '/(auth)/sign-up' })
  const title =
    intent === undefined ? 'Create an account' : signUpCardTitle(intent)
  const signInSearch = {
    ...(intent ? { intent } : {}),
    ...(redirect ? { redirect } : {}),
  }

  return (
    <AuthLayout>
      <Card className='w-full gap-4'>
        <CardHeader>
          <h1 className='text-lg leading-none font-semibold tracking-tight'>
            {title}
          </h1>
          <CardDescription>
            {intent === undefined ? (
              <>
                Enter your email and password to create an account. <br />
                Already have an account?{' '}
                <Link
                  to='/sign-in'
                  search={signInSearch}
                  className='underline underline-offset-4 hover:text-primary'
                >
                  Sign In
                </Link>
              </>
            ) : (
              <>
                {signUpCardDescription(intent)} Already have an account?{' '}
                <Link
                  to='/sign-in'
                  search={signInSearch}
                  className='underline underline-offset-4 hover:text-primary'
                >
                  Sign in
                </Link>
                {' · '}
                <Link
                  to='/sign-up'
                  search={redirect ? { redirect } : {}}
                  className='underline underline-offset-4 hover:text-primary'
                >
                  Other account type
                </Link>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm intent={intent} redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='px-2 text-center text-sm text-muted-foreground sm:px-8'>
            By creating an account, you agree to our{' '}
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
