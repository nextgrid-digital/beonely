/* @jsxImportSource react */
import type { PublicJobRow } from './public-job.js'
import { jobOgMetaChips, truncateText } from './job-og-meta.js'

export type OgJobCardProps = {
  job: PublicJobRow
  beonelyLogoUrl: string
}

export function OgJobCard ({ job, beonelyLogoUrl }: OgJobCardProps) {
  const chips = jobOgMetaChips(job)
  const title = truncateText(job.job_title, 72)
  const company = truncateText(job.company_name, 48)
  const location = job.location?.trim()
    ? truncateText(job.location, 56)
    : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(145deg, #fafafa 0%, #f4f4f5 45%, #ffffff 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#18181b',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '40px 48px 24px',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#52525b',
          }}
        >
          ServiceNow hiring
        </div>
        <img
          src={beonelyLogoUrl}
          alt='Beonely'
          width={140}
          height={40}
          style={{ objectFit: 'contain' }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 48px 32px',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 32, fontWeight: 500, color: '#3f3f46' }}>
          {company}
        </div>
        {location ? (
          <div style={{ fontSize: 24, color: '#71717a' }}>{location}</div>
        ) : null}
        {chips.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  fontSize: 18,
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: '1px solid #e4e4e7',
                  background: '#ffffff',
                  color: '#3f3f46',
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 48px',
          borderTop: '1px solid #e4e4e7',
          background: '#ffffff',
          fontSize: 20,
          color: '#71717a',
        }}
      >
        <span>beonely.com</span>
        <span>Apply on Beonely</span>
      </div>
    </div>
  )
}
