import { resumeStructuredEnvelopeSchema } from '@/lib/candidate/resume-structured-schema'
import { ReadCvResumePreview } from '@/features/candidate/resume-builder/read-cv-resume-preview'

/** Read-only Beonely resume layout for recruiter review (data from `applications.resume_structured_snapshot`). */
export function ApplicationProfileSnapshotReadonly({
  snapshot,
}: {
  snapshot: unknown
}) {
  const parsed = resumeStructuredEnvelopeSchema.safeParse(snapshot)
  if (!parsed.success) {
    return (
      <p className='text-sm text-muted-foreground'>
        No structured profile snapshot was stored for this application (older
        applications or incomplete profile data).
      </p>
    )
  }
  return <ReadCvResumePreview data={parsed.data} mode='view' />
}
