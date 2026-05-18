import { useMemo } from 'react'
import { getTransactionalEmailPreviews } from '@/lib/email/transactional-email-previews'

export function EmailTemplatePreviews() {
  const previews = useMemo(() => getTransactionalEmailPreviews(), [])

  return (
    <div className='space-y-8'>
      {previews.map((sample) => (
        <section key={sample.id} className='space-y-2'>
          <h2 className='text-sm font-medium'>{sample.label}</h2>
          <p className='text-xs text-muted-foreground'>
            Subject: {sample.subject}
          </p>
          <iframe
            title={sample.label}
            srcDoc={sample.html}
            className='h-[420px] w-full rounded-md border border-border bg-white'
            sandbox=''
          />
        </section>
      ))}
    </div>
  )
}
