import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main
      id='main-content'
      className='container grid min-h-svh max-w-none items-center justify-center px-3 sm:px-6'
    >
      <div className='mx-auto flex w-full max-w-md flex-col justify-center space-y-2 py-6 sm:py-8'>
        <div className='mb-4 flex items-center justify-center'>
          <Logo />
        </div>
        {children}
      </div>
    </main>
  )
}
