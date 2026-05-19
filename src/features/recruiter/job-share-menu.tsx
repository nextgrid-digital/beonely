import { useState } from 'react'
import { Link2, Mail, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  jobShareMessage,
  jobShareTitle,
  publicJobUrl,
} from '@/lib/jobs/job-share-url'
import type { JobRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export function JobShareMenu(props: {
  job: Pick<JobRow, 'job_title' | 'company_name' | 'location' | 'job_slug'>
  disabled?: boolean
  disabledReason?: string
  className?: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const url = publicJobUrl(props.job.job_slug)
  const title = jobShareTitle(props.job)
  const message = jobShareMessage(props.job)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
      setOpen(false)
    } catch {
      toast.error('Could not copy link')
    }
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: message, url })
      setOpen(false)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast.error('Share failed')
    }
  }

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${props.job.job_title} at ${props.job.company_name}`)}`
  const mailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`

  const trigger = (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={props.buttonClassName}
      disabled={props.disabled}
      aria-label='Share job'
    >
      <Share2 className='size-3.5' />
      Share
    </Button>
  )

  if (props.disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex', props.className)}>{trigger}</span>
        </TooltipTrigger>
        <TooltipContent>
          {props.disabledReason ?? 'Available after listing is live.'}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className={cn('inline-flex', props.className)}>{trigger}</div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-52'>
        <DropdownMenuItem onClick={() => void copyLink()}>
          <Link2 className='size-4' />
          Copy link
        </DropdownMenuItem>
        {canUseNativeShare() ? (
          <DropdownMenuItem onClick={() => void nativeShare()}>
            <Share2 className='size-4' />
            Share…
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={linkedInUrl} target='_blank' rel='noopener noreferrer'>
            LinkedIn
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={whatsAppUrl} target='_blank' rel='noopener noreferrer'>
            WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={xUrl} target='_blank' rel='noopener noreferrer'>
            X (Twitter)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={mailUrl}>
            <Mail className='size-4' />
            Email
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
