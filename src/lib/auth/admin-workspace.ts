export type AdminWorkspace = 'admin' | 'recruiter' | 'candidate' | 'public'

const STORAGE_KEY = 'beonely_admin_workspace'

export const ADMIN_WORKSPACE_LABELS: Record<
  AdminWorkspace,
  { label: string; description: string }
> = {
  admin: { label: 'Admin', description: 'Operations and email' },
  recruiter: { label: 'Recruiter', description: 'Recruiter portal preview' },
  candidate: { label: 'Candidate', description: 'Candidate profile preview' },
  public: { label: 'Public', description: 'Public job board' },
}

export function getAdminWorkspace(): AdminWorkspace {
  if (typeof window === 'undefined') return 'admin'
  const raw = localStorage.getItem(STORAGE_KEY)
  if (
    raw === 'admin' ||
    raw === 'recruiter' ||
    raw === 'candidate' ||
    raw === 'public'
  ) {
    return raw
  }
  return 'admin'
}

export function setAdminWorkspace(workspace: AdminWorkspace): void {
  localStorage.setItem(STORAGE_KEY, workspace)
}

export function workspacePath(workspace: AdminWorkspace): string {
  switch (workspace) {
    case 'admin':
      return '/admin'
    case 'recruiter':
      return '/recruiter'
    case 'candidate':
      return '/candidate/profile'
    case 'public':
      return '/'
    default: {
      const _exhaustive: never = workspace
      return _exhaustive
    }
  }
}
