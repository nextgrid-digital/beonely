const NEXTGRID_DIGITAL_URL = 'https://nextgrid.digital'

export function SiteVentureAttribution() {
  return (
    <footer
      data-testid='site-venture-attribution'
      className='border-t border-border py-4 text-center text-xs text-muted-foreground'
    >
      <p>
        A venture by{' '}
        <a
          href={NEXTGRID_DIGITAL_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
        >
          NextGrid.Digital
        </a>
      </p>
    </footer>
  )
}
