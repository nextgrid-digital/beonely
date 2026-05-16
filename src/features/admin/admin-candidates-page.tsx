import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminCandidates } from '@/features/admin/hooks/use-admin-candidates'

export function AdminCandidatesPage() {
  const query = useAdminCandidates()

  return (
    <div className='space-y-6 py-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Candidates</h1>
        <p className='text-sm text-muted-foreground'>
          Read-only view of job seeker profiles (no export).
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
          <AlertTitle>Could not load candidates</AlertTitle>
          <AlertDescription>
            {(query.error as Error)?.message ?? 'Unknown error'}
          </AlertDescription>
          <Button
            type='button'
            variant='outline'
            className='mt-3'
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </Alert>
      ) : null}

      {query.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead>Profile updated</TableHead>
              <TableHead className='text-end'>Applications</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className='font-medium'>
                  {row.full_name ?? '—'}
                </TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.phone ?? '—'}</TableCell>
                <TableCell className='max-w-40 truncate text-sm'>
                  {row.linkedin_url ? (
                    <a
                      href={row.linkedin_url}
                      target='_blank'
                      rel='noreferrer'
                      className='text-primary underline-offset-4 hover:underline'
                    >
                      Profile
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className='text-sm text-muted-foreground tabular-nums'>
                  {row.last_profile_update_at
                    ? new Date(row.last_profile_update_at).toLocaleString()
                    : new Date(row.updated_at).toLocaleString()}
                </TableCell>
                <TableCell className='text-end tabular-nums'>
                  {row.application_count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}
