import type { Database } from '@/lib/supabase/database.types'
import { beonelyMarketingHtml, marketingEmailSiteOrigin } from '@/lib/email/beonely-marketing-html'
import { beonelyTransactionalHtml } from '@/lib/email/beonely-transactional-html'
import { sanitizeJobDescriptionHtml } from '@/lib/jobs/sanitize-job-description-html'

export type EmailTemplateRow =
  Database['public']['Tables']['email_templates']['Row']

function applyMergeTokens(html: string): string {
  const origin = marketingEmailSiteOrigin()
  return html.replace(/\{\{site_url\}\}/g, origin)
}

function transactionalHeadlineFromBody(bodyHtml: string): string {
  const match = bodyHtml.match(/<h[12][^>]*>([^<]+)</i)
  if (match?.[1]) return match[1].trim()
  return 'Beonely'
}

function transactionalParagraphsFromBody(bodyHtml: string): string[] {
  const stripped = bodyHtml
    .replace(/<h[12][^>]*>[\s\S]*?<\/h[12]>/gi, '')
    .trim()
  const parts = stripped
    .split(/<\/p>\s*/i)
    .map((chunk) =>
      chunk
        .replace(/^<p[^>]*>/i, '')
        .replace(/<[^>]+>/g, '')
        .trim()
    )
    .filter(Boolean)
  return parts.length > 0 ? parts : ['Email preview.']
}

export function renderEmailTemplatePreview(
  template: Pick<
    EmailTemplateRow,
    'shell' | 'subject' | 'preview_text' | 'body_html'
  >
): string {
  const body = applyMergeTokens(sanitizeJobDescriptionHtml(template.body_html))

  if (template.shell === 'marketing') {
    return beonelyMarketingHtml({
      previewText: template.preview_text,
      bodyHtml: body,
    })
  }

  return beonelyTransactionalHtml({
    headline: transactionalHeadlineFromBody(body),
    bodyParagraphs: transactionalParagraphsFromBody(body),
  })
}
