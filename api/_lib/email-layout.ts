const BRAND = 'Beonely'
/** Fallback when `VITE_PUBLIC_SITE_URL` is unset in serverless (e.g. local `vercel dev` without env). */
const DEFAULT_SITE_ORIGIN = 'https://beonely.vercel.app'

function escapeHtml (s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function siteOrigin (): string {
  const raw = process.env.VITE_PUBLIC_SITE_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return DEFAULT_SITE_ORIGIN
}

/**
 * Branded HTML shell for Resend transactional email. Inline styles for client compatibility.
 */
export function beonelyTransactionalHtml (opts: {
  headline: string
  bodyParagraphs: string[]
}): string {
  const origin = siteOrigin()
  const logoUrl = `${origin}/images/beonely-logo.png`
  const safeHeadline = escapeHtml(opts.headline)
  const body = opts.bodyParagraphs
    .map((text) => {
      const t = escapeHtml(text)
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#374151;font-family:Inter,system-ui,-apple-system,sans-serif;">${t}</p>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${safeHeadline}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <img src="${escapeHtml(logoUrl)}" alt="${BRAND}" width="140" style="display:inline-block;max-width:140px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 32px;font-family:Inter,system-ui,-apple-system,sans-serif;">
              <h1 style="margin:0 0 20px;font-size:18px;line-height:1.35;font-weight:600;color:#18181b;">${safeHeadline}</h1>
              ${body}
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#71717a;">— The ${BRAND} team<br/><a href="${escapeHtml(origin)}" style="color:#2563eb;text-decoration:underline;">${escapeHtml(origin)}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
