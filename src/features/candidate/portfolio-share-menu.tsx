import { useState } from 'react'
import { Link2, Mail, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  portfolioShareMessage,
  portfolioShareTitle,
  publicPortfolioUrl,
} from '@/lib/candidate/portfolio-share-url'
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
  return (
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  )
}

export function PortfolioShareMenu(props: {
  handle: string
  name: string
  headline?: string | null
  disabled?: boolean
  disabledReason?: string
  className?: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const url = publicPortfolioUrl(props.handle)
  const title = portfolioShareTitle({
    name: props.name,
    headline: props.headline,
  })
  const message = portfolioShareMessage({
    name: props.name,
    headline: props.headline,
    handle: props.handle,
  })

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
  const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  const mailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`

  const trigger = (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={props.buttonClassName}
      disabled={props.disabled}
      aria-label='Share portfolio'
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
          {props.disabledReason ?? 'Publish your portfolio to share it.'}
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
