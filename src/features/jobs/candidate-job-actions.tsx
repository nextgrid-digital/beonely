import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-provider'
import { getSupabaseBrowserClient, getSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function RecordApplicationButton ({
  jobId,
  jobTitle,
  size = 'lg',
}: {
  jobId: string
  jobTitle: string
  size?: 'sm' | 'lg'
}) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const appliedQuery = useQuery({
    queryKey: ['job-application', user?.id, jobId],
    enabled: Boolean(user && getSupabaseConfigured()),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('job_applications')
        .select('id')
        .eq('user_id', user!.id)
        .eq('job_id', jobId)
        .maybeSingle()
      if (error) throw error
      return Boolean(data)
    },
  })

  const record = useMutation({
    mutationFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb.from('job_applications').insert({
        user_id: user!.id,
        job_id: jobId,
        notes: notes.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-application', user?.id, jobId] })
      void qc.invalidateQueries({ queryKey: ['job-applications'] })
      setOpen(false)
      setNotes('')
      toast.success('Application recorded')
    },
    onError: (err: unknown) => {
      const code = (err as { code?: string })?.code
      if (code === '23505') {
        toast.error('You already recorded an application for this job')
      } else {
        toast.error('Could not save application')
      }
    },
  })

  if (!user || !getSupabaseConfigured()) return null

  if (appliedQuery.data) {
    return (
      <Button type='button' variant='secondary' size={size} disabled>
        Application recorded
      </Button>
    )
  }

  return (
    <>
      <Button type='button' variant='secondary' size={size} onClick={() => setOpen(true)}>
        Mark as applied
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as applied — {jobTitle}</DialogTitle>
            <DialogDescription>
              Saves a note on your account so you can track this application alongside
              others.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Label htmlFor='app-notes'>Notes (optional)</Label>
            <Textarea
              id='app-notes'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='e.g. Applied via LinkedIn on …'
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='ghost' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type='button' disabled={record.isPending} onClick={() => record.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
