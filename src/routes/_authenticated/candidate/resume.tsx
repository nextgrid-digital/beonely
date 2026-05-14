import { useLayoutEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/candidate/resume')({
  component: CandidateResumeRedirect,
})

function CandidateResumeRedirect() {
  const navigate = useNavigate()
  useLayoutEffect(() => {
    void navigate({ to: '/candidate/profile', replace: true })
    const id = window.setTimeout(() => {
      document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth' })
    }, 200)
    return () => window.clearTimeout(id)
  }, [navigate])
  return <p className='px-4 py-6 text-sm text-muted-foreground'>Redirecting…</p>
}
