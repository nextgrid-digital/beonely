import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { fetchPublicPortfolio } from '@/lib/candidate/fetch-public-portfolio'
import { portfolioOgImageUrl } from '@/lib/candidate/portfolio-share-url'
import { publicSiteOrigin } from '@/lib/site/site-origin'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PortfolioShareMenu } from '@/features/candidate/portfolio-share-menu'
import {
  PUBLIC_SITE_BREADCRUMB_LINK,
  PUBLIC_SITE_BREADCRUMB_LIST,
  PUBLIC_SITE_MAIN_COLUMN,
  PublicSiteStickySubheader,
} from '@/features/jobs/public-site-layout'
import { ReadCvResumePreview } from '@/features/candidate/resume-builder/read-cv-resume-preview'

export const Route = createFileRoute('/p/$slug')({
  component: PortfolioPage,
})

function PortfolioBreadcrumb({ currentLabel }: { currentLabel: string }) {
  return (
    <ol className={PUBLIC_SITE_BREADCRUMB_LIST}>
      <li className='inline-flex items-center gap-2'>
        <Link to='/' className={PUBLIC_SITE_BREADCRUMB_LINK}>
          Home
        </Link>
        <ChevronRight className='size-4 shrink-0 opacity-60' aria-hidden />
      </li>
      <li className='min-w-0 font-medium text-stone-800' aria-current='page'>
        <span className='block truncate'>{currentLabel}</span>
      </li>
    </ol>
  )
}

function PortfolioPage() {
  const { slug } = Route.useParams()

  const portfolioQuery = useQuery({
    queryKey: ['public-portfolio', slug],
    queryFn: () => fetchPublicPortfolio(slug),
  })

  const portfolio = portfolioQuery.data

  if (portfolioQuery.isLoading) {
    return (
      <main
        id='main-content'
        className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-h-svh flex-col pb-12`}
      >
        <div className='w-full pt-2'>
          <PublicSiteStickySubheader
            breadcrumb={<PortfolioBreadcrumb currentLabel='Loading…' />}
          />
          <div
            className='mx-auto max-w-3xl space-y-4 pt-6 pb-16'
            aria-busy='true'
            aria-label='Loading portfolio'
          >
            <Skeleton className='size-20 rounded-full' />
            <Skeleton className='h-9 w-64' />
            <Skeleton className='h-5 w-48' />
            <Skeleton className='h-40 w-full' />
          </div>
        </div>
      </main>
    )
  }

  if (portfolioQuery.isError || !portfolio) {
    return (
      <main
        id='main-content'
        className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-h-svh flex-col pb-12`}
      >
        <div className='w-full pt-2'>
          <PublicSiteStickySubheader
            breadcrumb={<PortfolioBreadcrumb currentLabel='Portfolio not found' />}
          />
          <div className='mx-auto max-w-3xl pt-6 pb-16'>
            <h1 className='text-lg font-semibold sm:text-xl'>
              Portfolio not found
            </h1>
            <p className='mt-2 text-sm text-muted-foreground'>
              This portfolio may be unpublished or the link may be incorrect.
            </p>
            <Button
              asChild
              className='mt-4 min-h-11 w-full sm:min-h-9 sm:w-auto'
              variant='outline'
            >
              <Link to='/'>Back to Beonely</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const canonical = `${publicSiteOrigin()}/p/${portfolio.slug}`
  const ogImage = portfolioOgImageUrl(portfolio.slug)
  const title = `${portfolio.name} · Beonely`
  const description =
    [portfolio.headline, portfolio.about].filter(Boolean).join(' — ').slice(0, 160) ||
    `${portfolio.name} · ServiceNow profile on Beonely`

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name='description' content={description} />
        <link rel='canonical' href={canonical} />
        <meta property='og:title' content={title} />
        <meta property='og:description' content={description} />
        <meta property='og:url' content={canonical} />
        <meta property='og:type' content='profile' />
        <meta property='og:image' content={ogImage} />
        <meta property='og:image:width' content='1200' />
        <meta property='og:image:height' content='630' />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content={title} />
        <meta name='twitter:description' content={description} />
        <meta name='twitter:image' content={ogImage} />
      </Helmet>

      <main
        id='main-content'
        className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-h-svh flex-col pb-12`}
      >
        <div className='w-full pt-2'>
          <PublicSiteStickySubheader
            breadcrumb={<PortfolioBreadcrumb currentLabel={portfolio.name} />}
            actions={
              <PortfolioShareMenu
                handle={portfolio.slug}
                name={portfolio.name}
                headline={portfolio.headline}
              />
            }
          />
          <div className='bg-white font-sans text-slate-900'>
            <ReadCvResumePreview data={portfolio.resume} mode='view' />
          </div>
        </div>
      </main>
    </>
  )
}
