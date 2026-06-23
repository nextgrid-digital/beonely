import { createFileRoute } from '@tanstack/react-router'
import { HiringFaqPage } from '@/features/jobs/hiring-guides'

export const Route = createFileRoute('/hire/faq')({
  component: FaqPage,
})

function FaqPage() {
  return <HiringFaqPage />
}
