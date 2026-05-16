import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function useToggleRecruiterDisabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; disabled: boolean }) => {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb
        .from('recruiters')
        .update({ disabled: input.disabled })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-recruiters'] })
      toast.success('Recruiter updated')
    },
    onError: () => toast.error('Could not update recruiter'),
  })
}
