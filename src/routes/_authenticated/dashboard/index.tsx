import { createFileRoute, redirect } from '@tanstack/react-router'
import { fetchSessionPersona } from '@/lib/auth/route-guards'

/** Legacy template URL: send each persona to their real home. */
export const Route = createFileRoute('/_authenticated/dashboard/')({
  beforeLoad: async () => {
    const persona = await fetchSessionPersona()
    if (persona === 'admin') throw redirect({ to: '/admin' })
    if (persona === 'recruiter') throw redirect({ to: '/recruiter' })
    throw redirect({ to: '/candidate/profile' })
  },
})
