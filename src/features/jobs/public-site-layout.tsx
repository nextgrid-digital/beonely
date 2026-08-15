import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Logo } from '@/assets/logo'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { LinkedinIcon } from '@/components/icons/linkedin-icon'
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
    <div className='sticky top-14 z-40 -mx-4 -mt-2 mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 motion-reduce:transition-none'>
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
      { label: 'Changelog', to: '/changelog' },
    ],
  },
  {
    title: 'Accounts',
    links: [
      { label: 'Hire talent', to: '/hire' },
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
                hideCloseButton
              >
                <SheetDescription className='sr-only'>
                  Navigate public Beonely pages and account actions.
                </SheetDescription>
                <div className='flex items-center justify-between border-b border-border px-4 py-3'>
                  <SheetTitle className='text-sm font-medium'>Menu</SheetTitle>
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
                    <Link to='/hire' onClick={() => setMobileOpen(false)}>
                      Hire talent
                    </Link>
                  </Button>
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

const footerSocialLinks = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/beonely',
    icon: LinkedinIcon,
  },
] as const

export function PublicSiteFooter() {
  return (
    <footer className='relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center rounded-t-3xl border-t px-4 sm:px-6'>
      <div className='absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20 blur' />

      <div className='grid w-full gap-8 py-8 md:py-10 lg:grid-cols-3 lg:gap-8'>
        <FooterAnimatedContainer className='space-y-4'>
          <Link to='/' className='inline-flex'>
            <Logo className='h-7 w-auto' />
          </Link>
          <p className='text-sm text-muted-foreground'>
            Beonely — niche hiring for ServiceNow.
          </p>
          <div className='space-y-2'>
            <p className='text-sm text-muted-foreground'>
              Subscribe to ServiceNow job updates
            </p>
            <FooterNewsletterSubscribe />
          </div>
          <div className='flex items-center gap-3 pt-1'>
            {footerSocialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target='_blank'
                rel='noreferrer'
                aria-label={label}
                className='text-muted-foreground transition-colors hover:text-foreground'
              >
                <Icon className='size-4' />
              </a>
            ))}
          </div>
        </FooterAnimatedContainer>

        <nav
          aria-label='Footer navigation'
          className='grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-2'
        >
          {footerLinkGroups.map((group, index) => (
            <FooterAnimatedContainer
              key={group.title}
              delay={0.1 + index * 0.1}
            >
              <h2 className='text-xs font-medium tracking-wide text-foreground uppercase'>
                {group.title}
              </h2>
              <ul className='mt-4 space-y-2 text-sm text-muted-foreground'>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      hash={'hash' in link ? link.hash : undefined}
                      className='rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterAnimatedContainer>
          ))}
        </nav>
      </div>

      <div className='h-px w-full bg-linear-to-r via-border' />
      <div className='flex w-full items-center justify-center py-4'>
        <p className='text-sm text-muted-foreground'>
          &copy; {new Date().getFullYear()} Beonely. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

function FooterAnimatedContainer({
  className,
  delay = 0.1,
  children,
}: {
  delay?: number
  className?: string
  children: ReactNode
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      transition={{ delay, duration: 0.8 }}
      viewport={{ once: true }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
    >
      {children}
    </motion.div>
  )
}
