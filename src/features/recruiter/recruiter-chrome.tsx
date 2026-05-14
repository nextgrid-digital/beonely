import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { recruiterBreadcrumbSegments } from '@/features/recruiter/recruiter-nav-ia'

const breadcrumbListClass =
  'flex flex-wrap items-center gap-2 text-sm text-muted-foreground'

const breadcrumbLinkClass =
  'rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none'

export function RecruiterChrome() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const crumbs = recruiterBreadcrumbSegments(pathname)

  return (
    <div
      className={cn(
        'sticky top-14 z-40 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 motion-reduce:transition-none'
      )}
    >
      <nav aria-label='Breadcrumb' className='min-w-0'>
        <ol className={breadcrumbListClass}>
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={`${c.label}-${i}`} className='flex items-center gap-2'>
                {i > 0 ? (
                  <span className='text-muted-foreground' aria-hidden>
                    /
                  </span>
                ) : null}
                {c.to && !isLast ? (
                  <Link to={c.to} className={breadcrumbLinkClass}>
                    {c.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    }
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {c.label}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
