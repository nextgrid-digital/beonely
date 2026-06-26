import { rewrite } from '@vercel/functions'

const BOT_UA =
  /bot|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|Discordbot|Pinterest|Embedly|Quora|TelegramBot|vkShare/i

// Run on all page routes (skip API, Vercel internals, and static asset files) so
// the canonical-host redirect applies site-wide while staying cheap on assets.
export const config = {
  matcher: ['/((?!api/|_vercel/|.*\\.[\\w]+$).*)'],
}

/** Canonical public host (e.g. `beonely.in`) from env, with a safe fallback. */
function canonicalHost(): string {
  const raw = process.env.VITE_PUBLIC_SITE_URL?.trim()
  if (raw) {
    try {
      return new URL(raw).host
    } catch {
      // fall through to default
    }
  }
  return 'beonely.in'
}

export default function middleware(request: Request) {
  const url = new URL(request.url)

  // Canonicalize the host in production only: redirect the *.vercel.app
  // deployment alias (or any non-canonical host) to https://beonely.in so
  // sign-in / sign-out and every other navigation stays on the real domain.
  // Preview deployments (VERCEL_ENV === 'preview') and local dev are untouched.
  if (process.env.VERCEL_ENV === 'production') {
    const target = canonicalHost()
    if (url.host !== target) {
      const dest = new URL(url.toString())
      dest.protocol = 'https:'
      dest.host = target
      dest.port = ''
      return Response.redirect(dest.toString(), 308)
    }
  }

  const ua = request.headers.get('user-agent') ?? ''
  if (!BOT_UA.test(ua)) {
    return
  }

  const jobMatch = url.pathname.match(/^\/jobs\/([^/]+)\/?$/)
  if (jobMatch?.[1]) {
    return rewriteToShare(request, '/api/share/job', jobMatch[1])
  }

  const portfolioMatch = url.pathname.match(/^\/p\/([^/]+)\/?$/)
  if (portfolioMatch?.[1]) {
    return rewriteToShare(request, '/api/share/portfolio', portfolioMatch[1])
  }
}

/** Internally rewrite a bot request to a server-rendered OG meta endpoint. */
function rewriteToShare (request: Request, pathname: string, rawSlug: string) {
  const slug = decodeURIComponent(rawSlug)
  const shareUrl = new URL(request.url)
  shareUrl.pathname = pathname
  shareUrl.search = ''
  shareUrl.searchParams.set('slug', slug)
  return rewrite(shareUrl)
}
