import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminRecruiters } from '@/features/admin/hooks/use-admin-recruiters'
import { useToggleRecruiterDisabled } from '@/features/admin/hooks/use-toggle-recruiter-disabled'

export function AdminRecruitersPage() {
  const query = useAdminRecruiters()
  const toggleDisabled = useToggleRecruiterDisabled()

  return (
    <div className='space-y-6 py-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Recruiters</h1>
        <p className='text-sm text-muted-foreground'>
          Manage recruiter accounts. Disabling blocks portal access.
        </p>
      </div>

      {query.isLoading ? (
        <div className='flex justify-center py-12'>
          <Loader2 className='size-8 animate-spin text-muted-foreground' />
        </div>
      ) : null}

      {query.isError ? (
        <Alert variant='destructive'>
          <AlertCircle className='size-4' />
          <AlertTitle>Could not load recruiters</AlertTitle>
          <AlertDescription>
            {(query.error as Error)?.message ?? 'Unknown error'}
          </AlertDescription>
        </Alert>
      ) : null}

      {query.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Disabled</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className='font-medium'>
                  {row.company_name}
                </TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>
                  <Badge variant='secondary' className='capitalize'>
                    {row.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={row.disabled}
                    disabled={toggleDisabled.isPending}
                    onCheckedChange={(disabled) =>
                      toggleDisabled.mutate({ id: row.id, disabled })
                    }
                    aria-label={`Disable ${row.email}`}
                  />
                </TableCell>
                <TableCell className='text-sm text-muted-foreground tabular-nums'>
                  {new Date(row.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}
