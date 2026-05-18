import { type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const LOGO_SRC = '/images/beonely-logo.svg'
const LOGO_MARK_SRC = '/images/beonely-mark.svg'

type LogoProps = ImgHTMLAttributes<HTMLImageElement> & {
  title?: string
}

export function Logo({
  className,
  title = 'Beonely',
  alt,
  decoding = 'async',
  ...props
}: LogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt ?? title}
      title={title}
      decoding={decoding}
      className={cn(
        'h-6 w-auto max-w-[min(100%,12rem)] shrink-0 object-contain object-left',
        className
      )}
      {...props}
    />
  )
}

/** Circular Beonely mark (sidebar icon mode, favicon-style). */
export function LogoMark({
  className,
  title = 'Beonely',
  alt,
  decoding = 'async',
  ...props
}: LogoProps) {
  return (
    <img
      src={LOGO_MARK_SRC}
      alt={alt ?? title}
      title={title}
      decoding={decoding}
      className={cn('size-8 shrink-0 object-contain', className)}
      {...props}
    />
  )
}
