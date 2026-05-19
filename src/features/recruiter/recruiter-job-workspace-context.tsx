import { createContext, useContext, type ReactNode } from 'react'
import type { JobRow, RecruiterRow } from '@/lib/supabase/database.types'

export type RecruiterJobWorkspaceValue = {
  jobId: string
  recruiter: RecruiterRow
  job: JobRow
}

const RecruiterJobWorkspaceContext =
  createContext<RecruiterJobWorkspaceValue | null>(null)

export function RecruiterJobWorkspaceProvider(props: {
  value: RecruiterJobWorkspaceValue
  children: ReactNode
}) {
  return (
    <RecruiterJobWorkspaceContext.Provider value={props.value}>
      {props.children}
    </RecruiterJobWorkspaceContext.Provider>
  )
}

export function useRecruiterJobWorkspace(): RecruiterJobWorkspaceValue {
  const ctx = useContext(RecruiterJobWorkspaceContext)
  if (!ctx) {
    throw new Error(
      'useRecruiterJobWorkspace must be used within RecruiterJobWorkspaceProvider'
    )
  }
  return ctx
}
