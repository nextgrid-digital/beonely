import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import type { ProfileRow } from '@/lib/supabase/database.types'

const ROLE_LABEL: Record<ProfileRow['role'], string> = {
  candidate: 'Candidate',
  recruiter: 'Recruiter',
  admin: 'Admin',
}

export const adminProfilesColumns: ColumnDef<ProfileRow>[] = [
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Email' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-64 ps-2'>{row.getValue('email')}</LongText>
    ),
    filterFn: (row, _id, value) => {
      const v = String(value ?? '').trim().toLowerCase()
      if (!v) return true
      return row.original.email.toLowerCase().includes(v)
    },
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='User ID' />
    ),
    cell: ({ row }) => (
      <code className='text-muted-foreground text-xs'>{row.getValue('id')}</code>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Role' />
    ),
    cell: ({ row }) => {
      const role = row.original.role
      return (
        <Badge variant='secondary' className='capitalize'>
          {ROLE_LABEL[role]}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const arr = value as string[] | undefined
      if (!arr?.length) return true
      return arr.includes(row.getValue(id))
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) => {
      const raw = row.getValue('created_at') as string
      const d = new Date(raw)
      return (
        <span className='text-muted-foreground text-sm tabular-nums'>
          {Number.isNaN(d.getTime()) ? raw : d.toLocaleString()}
        </span>
      )
    },
    enableSorting: true,
  },
]
