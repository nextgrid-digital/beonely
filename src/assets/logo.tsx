import { type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

const LOGO_SRC = '/images/beonely-logo.png'

export function Logo ({
  className,
  alt = 'Beonely',
  ...props
}: ComponentPropsWithoutRef<'img'>) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={cn(
        'h-6 w-auto max-w-[min(100%,12rem)] object-contain object-left',
        className
      )}
      {...props}
    />
  )
}
