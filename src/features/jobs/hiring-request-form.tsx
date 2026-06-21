import { useMutation } from '@tanstack/react-query'
import { Loader2, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { submitHiringRequest, type HiringRequestInput } from '@/lib/hiring-requests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const shortlistMailto =
  'mailto:nextgrid_os@agentmail.to?cc=hello@nextgrid.digital&subject=Beonely%20ServiceNow%20hiring%20request'

type FormState = {
  company_name: string
  contact_name: string
  email: string
  phone: string
  company_website: string
  role_title: string
  hiring_type: HiringRequestInput['hiring_type']
  work_mode: NonNullable<HiringRequestInput['work_mode']>
  location: string
  timeline: string
  headcount: string
  servicenow_scope: string
  notes: string
}

const initialState: FormState = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  company_website: '',
  role_title: '',
  hiring_type: 'full_time',
  work_mode: 'flexible',
  location: '',
  timeline: '',
  headcount: '',
  servicenow_scope: '',
  notes: '',
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function HiringRequestForm() {
  const [form, setForm] = useState<FormState>(initialState)

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: HiringRequestInput = {
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: normalizeOptional(form.phone),
        company_website: normalizeOptional(form.company_website),
        role_title: form.role_title.trim(),
        hiring_type: form.hiring_type,
        work_mode: form.work_mode,
        location: normalizeOptional(form.location),
        timeline: normalizeOptional(form.timeline),
        headcount: form.headcount.trim() ? Number(form.headcount.trim()) : null,
        servicenow_scope: normalizeOptional(form.servicenow_scope),
        notes: normalizeOptional(form.notes),
      }
      return submitHiringRequest(payload)
    },
    onSuccess: () => {
      toast.success('Hiring request received')
      setForm(initialState)
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Could not submit request'
      toast.error(message)
    },
  })

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await mutation.mutateAsync()
  }

  return (
    <section className='rounded-2xl border bg-card p-6 shadow-sm sm:p-8'>
      <div className='max-w-2xl space-y-3'>
        <h2 className='text-2xl font-semibold tracking-tight'>
          Request a curated ServiceNow shortlist
        </h2>
        <p className='text-sm leading-6 text-muted-foreground sm:text-base'>
          Tell Beonely what you need. This creates a hiring request for manual follow-up,
          so buyer intent does not disappear into generic traffic.
        </p>
      </div>

      <form onSubmit={onSubmit} className='mt-6 grid gap-5 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='company_name'>Company name</Label>
          <Input
            id='company_name'
            required
            value={form.company_name}
            onChange={(e) => update('company_name', e.target.value)}
            placeholder='Acme Services'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='contact_name'>Contact name</Label>
          <Input
            id='contact_name'
            required
            value={form.contact_name}
            onChange={(e) => update('contact_name', e.target.value)}
            placeholder='Hiring manager or recruiter'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='email'>Work email</Label>
          <Input
            id='email'
            type='email'
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder='you@company.com'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='phone'>Phone or WhatsApp</Label>
          <Input
            id='phone'
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder='+91...'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='company_website'>Company website</Label>
          <Input
            id='company_website'
            type='url'
            value={form.company_website}
            onChange={(e) => update('company_website', e.target.value)}
            placeholder='https://company.com'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='role_title'>Role title</Label>
          <Input
            id='role_title'
            required
            value={form.role_title}
            onChange={(e) => update('role_title', e.target.value)}
            placeholder='ServiceNow Developer, Architect, Admin...'
          />
        </div>
        <div className='space-y-2'>
          <Label>Hiring type</Label>
          <Select
            value={form.hiring_type}
            onValueChange={(value) =>
              update('hiring_type', value as FormState['hiring_type'])
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select hiring type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='full_time'>Full-time</SelectItem>
              <SelectItem value='contract'>Contract</SelectItem>
              <SelectItem value='multiple'>Multiple hires</SelectItem>
              <SelectItem value='not_sure'>Not sure yet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <Label>Work mode</Label>
          <Select
            value={form.work_mode}
            onValueChange={(value) =>
              update('work_mode', value as FormState['work_mode'])
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select work mode' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='remote'>Remote</SelectItem>
              <SelectItem value='hybrid'>Hybrid</SelectItem>
              <SelectItem value='onsite'>Onsite</SelectItem>
              <SelectItem value='flexible'>Flexible</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='location'>Location</Label>
          <Input
            id='location'
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder='Bangalore / Remote / UK / US...'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='timeline'>Hiring timeline</Label>
          <Input
            id='timeline'
            value={form.timeline}
            onChange={(e) => update('timeline', e.target.value)}
            placeholder='Immediate / 2 weeks / This quarter'
          />
        </div>
        <div className='space-y-2 md:col-span-2'>
          <Label htmlFor='headcount'>Headcount</Label>
          <Input
            id='headcount'
            inputMode='numeric'
            pattern='[0-9]*'
            value={form.headcount}
            onChange={(e) => update('headcount', e.target.value)}
            placeholder='1'
          />
        </div>
        <div className='space-y-2 md:col-span-2'>
          <Label htmlFor='servicenow_scope'>ServiceNow scope</Label>
          <Textarea
            id='servicenow_scope'
            value={form.servicenow_scope}
            onChange={(e) => update('servicenow_scope', e.target.value)}
            placeholder='Modules, certs, years of experience, partner/end-client context, integration needs...'
          />
        </div>
        <div className='space-y-2 md:col-span-2'>
          <Label htmlFor='notes'>Anything else</Label>
          <Textarea
            id='notes'
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder='Comp range, notice period expectations, must-have skills, timezone constraints...'
          />
        </div>
        <div className='md:col-span-2 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm text-muted-foreground'>
            Prefer email? You can also send the brief directly.
          </p>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className='size-4 animate-spin' aria-hidden />
              ) : null}
              Submit hiring request
            </Button>
            <Button asChild type='button' variant='outline'>
              <a href={shortlistMailto}>
                Email instead
                <Mail className='size-4' aria-hidden />
              </a>
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
