import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiPost } from '@/lib/api-client'
import { useAuth } from '@/context/auth-provider'

export function useToggleRecruiterDisabled() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (input: { id: string; disabled: boolean }) => {
      if (!session?.access_token) throw new Error('missing_access_token')
      await apiPost('/api/admin/recruiters', input, session.access_token)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-recruiters'] })
      toast.success('Recruiter updated')
    },
    onError: () => toast.error('Could not update recruiter'),
  })
}
