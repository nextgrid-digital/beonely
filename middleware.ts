import { rewrite } from '@vercel/functions'

const BOT_UA =
  /bot|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|Discordbot|Pinterest|Embedly|Quora|TelegramBot|vkShare/i

export const config = {
  matcher: ['/jobs/:slug'],
}

export default function middleware (request: Request) {
  const ua = request.headers.get('user-agent') ?? ''
  if (!BOT_UA.test(ua)) {
    return
  }

  const { pathname } = new URL(request.url)
  const match = pathname.match(/^\/jobs\/([^/]+)\/?$/)
  if (!match?.[1]) {
    return
  }

  const slug = decodeURIComponent(match[1])
  const shareUrl = new URL(request.url)
  shareUrl.pathname = '/api/share/job'
  shareUrl.search = ''
  shareUrl.searchParams.set('slug', slug)

  return rewrite(shareUrl)
}
