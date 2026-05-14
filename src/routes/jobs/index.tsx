import { createFileRoute, redirect } from '@tanstack/react-router'
import { publishedJobsFilterSchema } from '@/lib/jobs/fetch-published-jobs'

export const Route = createFileRoute('/jobs/')({
  validateSearch: publishedJobsFilterSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/',
      search,
    })
  },
})
