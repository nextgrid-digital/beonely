import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Copy, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  fetchEmailTemplates,
  updateEmailTemplate,
  type EmailTemplateRow,
} from '@/lib/email/admin-email-api'
import { renderEmailTemplatePreview } from '@/lib/email/render-email-template'
import { useAuth } from '@/context/auth-provider'
import { EmailBodyRichTextField } from '@/features/admin/email-body-rich-text-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const AUDIENCE_LABELS: Record<string, string> = {
  candidates: 'Candidates',
  recruiters: 'Recruiters',
  newsletter: 'Newsletter',
}

type Draft = {
  name: string
  subject: string
  preview_text: string
  body_html: string
}

function groupTemplates(templates: EmailTemplateRow[]) {
  const transactional = templates.filter((t) => t.category === 'transactional')
  const marketing = templates.filter((t) => t.category === 'marketing')
  return {
    transactional,
    marketingCandidates: marketing.filter((t) => t.audience === 'candidates'),
    marketingRecruiters: marketing.filter((t) => t.audience === 'recruiters'),
    marketingNewsletter: marketing.filter((t) => t.audience === 'newsletter'),
  }
}

function draftFromTemplate(t: EmailTemplateRow): Draft {
  return {
    name: t.name,
    subject: t.subject,
    preview_text: t.preview_text ?? '',
    body_html: t.body_html,
  }
}

export function AdminEmailTemplatesPage({
  templateId,
}: {
  templateId?: string
}) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const token = session?.access_token
  const qc = useQueryClient()

  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAudience, setNewAudience] = useState<
    'candidates' | 'recruiters' | 'newsletter'
  >('candidates')
  const [draft, setDraft] = useState<Draft | null>(null)

  const templatesQuery = useQuery({
    queryKey: ['admin-email-templates', token],
    enabled: Boolean(token),
    queryFn: () => fetchEmailTemplates(token!),
  })

  const selected = useMemo(() => {
    const list = templatesQuery.data ?? []
    if (!templateId) return null
    return list.find((t) => t.id === templateId) ?? null
  }, [templatesQuery.data, templateId])

  useEffect(() => {
    if (selected) {
      setDraft(draftFromTemplate(selected))
    } else {
      setDraft(null)
    }
  }, [selected?.id, selected?.updated_at])

  const isMarketing = selected?.category === 'marketing'
  const previewHtml = useMemo(() => {
    if (!selected) return ''
    const body = draft?.body_html ?? selected.body_html
    return renderEmailTemplatePreview({
      shell: selected.shell,
      subject: draft?.subject ?? selected.subject,
      preview_text: draft?.preview_text ?? selected.preview_text,
      body_html: body,
    })
  }, [selected, draft])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !selected || !draft) return
      return updateEmailTemplate(token, selected.id, {
        name: draft.name,
        subject: draft.subject,
        preview_text: draft.preview_text || null,
        body_html: draft.body_html,
      })
    },
    onSuccess: () => {
      toast.success('Template saved')
      void qc.invalidateQueries({ queryKey: ['admin-email-templates'] })
    },
    onError: () => toast.error('Could not save template'),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createEmailTemplate(token!, {
        name: newName.trim(),
        audience: newAudience,
        subject: 'Subject line',
        preview_text: 'Preview text for inbox',
        body_html: '<p>Hello from Beonely.</p>',
      }),
    onSuccess: (t) => {
      toast.success('Template created')
      setNewOpen(false)
      setNewName('')
      void qc.invalidateQueries({ queryKey: ['admin-email-templates'] })
      void navigate({
        to: '/admin/email/templates/$templateId',
        params: { templateId: t.id },
      })
    },
    onError: () => toast.error('Could not create template'),
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateEmailTemplate(token!, selected!.id),
    onSuccess: (t) => {
      toast.success('Template duplicated')
      void qc.invalidateQueries({ queryKey: ['admin-email-templates'] })
      void navigate({
        to: '/admin/email/templates/$templateId',
        params: { templateId: t.id },
      })
    },
    onError: () => toast.error('Could not duplicate'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteEmailTemplate(token!, selected!.id),
    onSuccess: () => {
      toast.success('Template deleted')
      void qc.invalidateQueries({ queryKey: ['admin-email-templates'] })
      void navigate({ to: '/admin/email/templates' })
    },
    onError: () => toast.error('Could not delete template'),
  })

  const groups = groupTemplates(templatesQuery.data ?? [])

  const selectTemplate = (id: string) => {
    void navigate({
      to: '/admin/email/templates/$templateId',
      params: { templateId: id },
    })
  }

  const renderNavGroup = (label: string, items: EmailTemplateRow[]) => {
    if (items.length === 0) return null
    return (
      <div className='space-y-1'>
        <p className='px-2 text-xs font-medium text-muted-foreground'>{label}</p>
        {items.map((t) => (
          <button
            key={t.id}
            type='button'
            onClick={() => selectTemplate(t.id)}
            className={cn(
              'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
              templateId === t.id && 'bg-muted font-medium'
            )}
          >
            {t.name}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className='flex min-h-[calc(100vh-8rem)] flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Templates</h1>
          <p className='text-sm text-muted-foreground'>
            Marketing templates are editable. Transactional templates mirror live
            automations (read-only).
          </p>
        </div>
        <Button type='button' onClick={() => setNewOpen(true)}>
          <Plus className='size-4' />
          New template
        </Button>
      </div>

      <div className='flex min-h-0 flex-1 flex-col gap-4 lg:flex-row'>
        <aside className='w-full shrink-0 space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-3 lg:w-56'>
          {templatesQuery.isLoading ? (
            <Skeleton className='h-40 w-full' />
          ) : (
            <>
              {renderNavGroup('Transactional', groups.transactional)}
              {renderNavGroup('Candidates', groups.marketingCandidates)}
              {renderNavGroup('Recruiters', groups.marketingRecruiters)}
              {renderNavGroup('Newsletter', groups.marketingNewsletter)}
            </>
          )}
        </aside>

        <main className='min-w-0 flex-1 space-y-4'>
          {!templateId || !selected ? (
            <div className='flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground'>
              Select a template from the sidebar, or create a new marketing
              template.
            </div>
          ) : (
            <>
              {!isMarketing ? (
                <Alert>
                  <AlertDescription>
                    Transactional templates are read-only. They reflect emails
                    sent by automations. Duplicate as marketing to customize.
                  </AlertDescription>
                </Alert>
              ) : null}

              <iframe
                title='Email preview'
                srcDoc={previewHtml}
                className='h-[360px] w-full rounded-md border border-border bg-white'
                sandbox=''
              />

              {draft ? (
                <div className='space-y-4 rounded-lg border border-border p-4'>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='space-y-2 sm:col-span-2'>
                      <Label htmlFor='tpl-name'>Name</Label>
                      <Input
                        id='tpl-name'
                        value={draft.name}
                        disabled={!isMarketing}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                      />
                    </div>
                    <div className='space-y-2 sm:col-span-2'>
                      <Label htmlFor='tpl-subject'>Subject</Label>
                      <Input
                        id='tpl-subject'
                        value={draft.subject}
                        disabled={!isMarketing}
                        onChange={(e) =>
                          setDraft({ ...draft, subject: e.target.value })
                        }
                      />
                    </div>
                    {selected.shell === 'marketing' ? (
                      <div className='space-y-2 sm:col-span-2'>
                        <Label htmlFor='tpl-preview'>Preview text</Label>
                        <Input
                          id='tpl-preview'
                          value={draft.preview_text}
                          disabled={!isMarketing}
                          onChange={(e) =>
                            setDraft({ ...draft, preview_text: e.target.value })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className='space-y-2'>
                    <Label>Body</Label>
                    <EmailBodyRichTextField
                      value={draft.body_html}
                      disabled={!isMarketing}
                      onChange={(html) =>
                        setDraft({ ...draft, body_html: html })
                      }
                    />
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {isMarketing ? (
                      <Button
                        type='button'
                        disabled={saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className='size-4 animate-spin' />
                        ) : null}
                        Save
                      </Button>
                    ) : null}
                    <Button
                      type='button'
                      variant='outline'
                      disabled={duplicateMutation.isPending}
                      onClick={() => duplicateMutation.mutate()}
                    >
                      <Copy className='size-4' />
                      Duplicate
                    </Button>
                    {isMarketing && !selected.is_system ? (
                      <Button
                        type='button'
                        variant='destructive'
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate()}
                      >
                        <Trash2 className='size-4' />
                        Delete
                      </Button>
                    ) : null}
                    {selected.audience ? (
                      <Button type='button' variant='secondary' asChild>
                        <Link
                          to='/admin/email/campaigns/new'
                          search={{
                            templateId: selected.id,
                            audience: selected.audience,
                          }}
                        >
                          Use in campaign
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </main>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New marketing template</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='new-tpl-name'>Name</Label>
              <Input
                id='new-tpl-name'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Audience</Label>
              <Select
                value={newAudience}
                onValueChange={(v) =>
                  setNewAudience(v as typeof newAudience)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
