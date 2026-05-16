import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/assets/logo'
import { PublicSiteAccountNav } from '@/features/jobs/public-site-account-nav'
import { PublicSiteAuthProvider } from '@/features/jobs/public-site-auth-provider'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { FooterNewsletterSubscribe } from '@/features/jobs/footer-newsletter-subscribe'

/** Shared with profile resume builder and jobs detail sticky subheaders. */
export const PUBLIC_SITE_BREADCRUMB_LIST =
  'flex flex-wrap items-center gap-2 text-sm text-stone-500'

export const PUBLIC_SITE_BREADCRUMB_LINK =
  'rounded-sm hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400'

/** Sticky bar below the public site header (Home … + optional actions). */
export function PublicSiteStickySubheader({
  breadcrumb,
  actions,
}: {
  breadcrumb: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className='sticky top-14 z-40 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 motion-reduce:transition-none'>
      <nav aria-label='Breadcrumb' className='min-w-0'>
        {breadcrumb}
      </nav>
      {actions != null ? (
        <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
          {actions}
        </div>
      ) : null}
    </div>
  )
}

/** Single max width for public header, main, and aligned chrome (home + jobs). */
export const PUBLIC_SITE_MAX = 'max-w-5xl'

/** Same outer column as landing `#main-content`: centered, full width up to max, horizontal padding. */
export const PUBLIC_SITE_MAIN_COLUMN = `mx-auto w-full ${PUBLIC_SITE_MAX} px-4`

export function PublicSiteAuthShell({ children }: { children: ReactNode }) {
  return <PublicSiteAuthProvider>{children}</PublicSiteAuthProvider>
}

export function PublicSiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <a
        href='#main-content'
        className='sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:inline-block focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:whitespace-normal focus:text-primary-foreground focus:shadow-md focus:ring-2 focus:ring-ring focus:outline-none'
      >
        Skip to content
      </a>
      <header className='fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur transition-colors duration-200 supports-[backdrop-filter]:bg-background/80 motion-reduce:transition-none'>
        <div
          className={`mx-auto flex h-14 ${PUBLIC_SITE_MAX} items-center justify-between gap-4 px-4 text-sm`}
        >
          <Link
            to='/'
            className='flex items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none'
          >
            <Logo className='h-7 w-auto max-w-[10rem]' />
          </Link>
          <nav className='hidden items-center gap-4 text-sm sm:flex'>
            <PublicSiteAccountNav />
          </nav>
          <div className='sm:hidden'>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='size-11'
                  aria-label='Open navigation menu'
                >
                  <Menu className='size-5' aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side='right'
                className='flex w-[min(92vw,22rem)] flex-col gap-0 p-0'
              >
                <div className='flex items-center justify-between border-b border-border px-4 py-3'>
                  <span className='text-sm font-medium'>Menu</span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-11'
                    onClick={() => setMobileOpen(false)}
                    aria-label='Close navigation menu'
                  >
                    <X className='size-5' aria-hidden />
                  </Button>
                </div>
                <div className='grid gap-2 px-4 py-4'>
                  <Button
                    asChild
                    variant='ghost'
                    className='h-11 justify-start px-3 text-sm'
                  >
                    <Link
                      to='/'
                      hash='open-roles'
                      onClick={() => setMobileOpen(false)}
                    >
                      Open roles
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant='ghost'
                    className='h-11 justify-start px-3 text-sm'
                  >
                    <Link
                      to='/'
                      hash='linkedin-roles'
                      onClick={() => setMobileOpen(false)}
                    >
                      Roles from LinkedIn
                    </Link>
                  </Button>
                </div>
                <div className='border-t border-border px-4 py-4'>
                  <PublicSiteAccountNav />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  )
}

export function PublicSiteFooter() {
  return (
    <footer className='border-t border-border py-8 text-center text-sm text-muted-foreground'>
      <p>Beonely — niche hiring for ServiceNow.</p>
      <p className='mt-2'>Subscribe to ServiceNow job updates</p>
      <FooterNewsletterSubscribe />
    </footer>
  )
}
