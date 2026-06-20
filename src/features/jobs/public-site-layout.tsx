import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/assets/logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { FooterNewsletterSubscribe } from '@/features/jobs/footer-newsletter-subscribe'
import { PublicSiteAccountNav } from '@/features/jobs/public-site-account-nav'

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
export const PUBLIC_SITE_MAIN_COLUMN = `mx-auto w-full min-w-0 ${PUBLIC_SITE_MAX} px-4`

const footerLinkGroups = [
  {
    title: 'Browse',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Open roles', to: '/', hash: 'open-roles' },
      { label: 'LinkedIn roles', to: '/', hash: 'linkedin-roles' },
      { label: 'Changelog', to: '/changelog' },
    ],
  },
  {
    title: 'Accounts',
    links: [
      { label: 'Recruiter sign up', to: '/hire/sign-up' },
      { label: 'Candidate sign up', to: '/apply/sign-up' },
    ],
  },
  {
    title: 'Email',
    links: [{ label: 'Unsubscribe', to: '/unsubscribe' }],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
] as const

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
    <footer className='border-t border-border py-8 text-sm text-muted-foreground'>
      <div className={`${PUBLIC_SITE_MAIN_COLUMN} space-y-8`}>
        <div className='grid gap-8 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-start'>
          <div className='space-y-3'>
            <p>Beonely — niche hiring for ServiceNow.</p>
            <div className='space-y-2'>
              <p>Subscribe to ServiceNow job updates</p>
              <FooterNewsletterSubscribe />
            </div>
          </div>

          <nav
            aria-label='Footer navigation'
            className='grid gap-6 text-left sm:grid-cols-4'
          >
            {footerLinkGroups.map((group) => (
              <div key={group.title} className='space-y-2'>
                <h2 className='text-xs font-medium tracking-wide text-foreground uppercase'>
                  {group.title}
                </h2>
                <ul className='space-y-1.5'>
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        hash={'hash' in link ? link.hash : undefined}
                        className='rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
