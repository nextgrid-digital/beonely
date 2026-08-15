import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchAutomations, patchAutomation } from '@/lib/email/admin-email-api'
import { getTransactionalEmailPreviews } from '@/lib/email/transactional-email-previews'
import { useAuth } from '@/context/auth-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminQueryError } from '@/features/admin/admin-query-error'

export function AdminEmailAutomationsPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const qc = useQueryClient()
  const previews = getTransactionalEmailPreviews()

  const query = useQuery({
    queryKey: ['admin-email-automations', token],
    enabled: Boolean(token),
    queryFn: () => fetchAutomations(token!),
  })

  const toggle = useMutation({
    mutationFn: (input: { trigger_key: string; enabled: boolean }) =>
      patchAutomation(token!, input.trigger_key, input.enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-email-automations'] })
      toast.success('Automation updated')
    },
    onError: () => toast.error('Update failed'),
  })

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Automations</h1>
        <p className='text-sm text-muted-foreground'>
          Transactional emails sent automatically on lifecycle events.
        </p>
      </div>
      {query.isError ? (
        <AdminQueryError
          title='Could not load automations'
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isLoading ? <Skeleton className='h-64 w-full' /> : null}
      {!query.isLoading && !query.isError ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trigger</TableHead>
              <TableHead>Last 7d sent</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead className='text-end'>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className='h-24 text-center text-muted-foreground'
                >
                  No automation rules are configured.
                </TableCell>
              </TableRow>
            ) : null}
            {(query.data ?? []).map((rule) => (
              <TableRow key={rule.trigger_key}>
                <TableCell>
                  <p className='font-medium'>{rule.label}</p>
                  <p className='text-xs text-muted-foreground'>
                    {rule.trigger_key}
                  </p>
                </TableCell>
                <TableCell>{rule.last_7d.sent}</TableCell>
                <TableCell>{rule.last_7d.failed}</TableCell>
                <TableCell className='text-end'>
                  <Switch
                    aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.label}`}
                    checked={rule.enabled}
                    disabled={toggle.isPending}
                    onCheckedChange={(enabled) =>
                      toggle.mutate({
                        trigger_key: rule.trigger_key,
                        enabled,
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <div className='space-y-6'>
        <h2 className='text-lg font-medium'>Template previews</h2>
        {previews.map((p) => (
          <section key={p.id} className='space-y-2'>
            <p className='text-sm font-medium'>{p.label}</p>
            <iframe
              title={p.label}
              srcDoc={p.html}
              className='h-64 w-full rounded-md border border-border bg-white'
              sandbox=''
            />
          </section>
        ))}
      </div>
    </div>
  )
}
