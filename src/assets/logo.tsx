import { type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const LOGO_SRC = '/images/beonely-logo.svg'

type LogoProps = ImgHTMLAttributes<HTMLImageElement> & {
  title?: string
}

export function Logo ({
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
