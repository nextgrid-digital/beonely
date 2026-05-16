import { createFileRoute } from '@tanstack/react-router'
import { EmailTemplatePreviews } from '@/features/admin/email-template-previews'

export const Route = createFileRoute('/_authenticated/admin/email/templates')({
  component: EmailTemplatesPage,
})

function EmailTemplatesPage() {
  return (
    <div className='space-y-4'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Templates</h1>
        <p className='text-sm text-muted-foreground'>
          Read-only previews of transactional email HTML.
        </p>
      </div>
      <EmailTemplatePreviews />
    </div>
  )
}
