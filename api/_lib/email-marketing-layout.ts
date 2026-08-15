import { serverSiteOrigin } from './site-origin.js'

const BRAND = 'Beonely'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Marketing email shell with unsubscribe footer (required). */
export function beonelyMarketingHtml(opts: {
  previewText?: string | null
  bodyHtml: string
  unsubscribeUrl: string
}): string {
  const origin = serverSiteOrigin()
  const logoUrl = `${origin}/images/beonely-logo.svg`
  const preview = opts.previewText?.trim()
    ? `<span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.previewText!.trim())}</span>`
    : ''
  const body = opts.bodyHtml.trim()
  const safeUnsub = escapeHtml(opts.unsubscribeUrl)

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  ${preview}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <img src="${escapeHtml(logoUrl)}" alt="${BRAND}" width="140" style="display:inline-block;max-width:140px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 16px;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:#374151;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;font-family:Inter,system-ui,sans-serif;font-size:12px;line-height:1.5;color:#71717a;">
              <p style="margin:0;">You received this because you opted in to Beonely updates.</p>
              <p style="margin:8px 0 0;"><a href="${safeUnsub}" style="color:#2563eb;">Unsubscribe</a> · <a href="${escapeHtml(origin)}" style="color:#2563eb;">${escapeHtml(origin)}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
