import type { UseFormReturn } from 'react-hook-form'
import {
  SERVICENOW_JOB_CERTIFICATIONS,
  SERVICENOW_JOB_MODULES,
  SERVICENOW_JOB_SKILLS,
} from '@/lib/jobs/servicenow-job-taxonomy'
import { cn } from '@/lib/utils'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  META_CONTROL,
  META_SELECT_TRIGGER,
} from '@/features/jobs/job-listing-meta-control'
import { MetaSalaryField } from '@/features/jobs/meta-salary-field'
import { TaxonomyChipRow } from '@/features/jobs/taxonomy-chip-row'
import type { JobEditorValues } from '@/features/recruiter/recruiter-job-editor-page'

function formatEnumLabel(value: string): string {
  return value.replace(/_/g, ' ')
}

function MetaSelectField(props: {
  form: UseFormReturn<JobEditorValues>
  name: keyof JobEditorValues
  label: string
  options: { value: string; label: string }[]
}) {
  return (
    <FormField
      control={props.form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem className='space-y-0'>
          <FormLabel className='sr-only'>{props.label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={String(field.value ?? '')}
          >
            <FormControl>
              <SelectTrigger className={META_SELECT_TRIGGER}>
                <SelectValue placeholder={props.label} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {props.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage className='text-xs' />
        </FormItem>
      )}
    />
  )
}

export function JobListingMetaEditor(props: {
  form: UseFormReturn<JobEditorValues>
  className?: string
}) {
  const { form } = props

  return (
    <div className={cn('space-y-3', props.className)}>
      <div className='flex flex-wrap items-center gap-2'>
        <FormField
          control={form.control}
          name='location'
          render={({ field }) => (
            <FormItem className='space-y-0'>
              <FormLabel className='sr-only'>Location</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder='Location'
                  className={cn(META_CONTROL, 'max-w-[14rem]')}
                />
              </FormControl>
              <FormMessage className='text-xs' />
            </FormItem>
          )}
        />
        <MetaSelectField
          form={form}
          name='employment_type'
          label='Employment'
          options={[
            { value: 'full_time', label: formatEnumLabel('full_time') },
            { value: 'part_time', label: formatEnumLabel('part_time') },
            { value: 'contract', label: formatEnumLabel('contract') },
            { value: 'freelance', label: formatEnumLabel('freelance') },
          ]}
        />
        <MetaSelectField
          form={form}
          name='work_mode'
          label='Work mode'
          options={[
            { value: 'remote', label: formatEnumLabel('remote') },
            { value: 'hybrid', label: formatEnumLabel('hybrid') },
            { value: 'onsite', label: 'On-site' },
          ]}
        />
        <MetaSelectField
          form={form}
          name='experience_level'
          label='Experience'
          options={[
            { value: 'entry', label: formatEnumLabel('entry') },
            { value: 'mid', label: formatEnumLabel('mid') },
            { value: 'senior', label: formatEnumLabel('senior') },
            { value: 'lead', label: formatEnumLabel('lead') },
            { value: 'principal', label: formatEnumLabel('principal') },
          ]}
        />
        <MetaSelectField
          form={form}
          name='job_type'
          label='Role'
          options={[
            { value: 'developer', label: formatEnumLabel('developer') },
            { value: 'architect', label: formatEnumLabel('architect') },
            { value: 'consultant', label: formatEnumLabel('consultant') },
            { value: 'admin', label: formatEnumLabel('admin') },
            { value: 'analyst', label: formatEnumLabel('analyst') },
            { value: 'manager', label: formatEnumLabel('manager') },
            { value: 'other', label: formatEnumLabel('other') },
          ]}
        />
        <MetaSalaryField form={form} />
      </div>

      <FormField
        control={form.control}
        name='modules'
        render={({ field }) => (
          <FormItem className='space-y-0'>
            <FormControl>
              <TaxonomyChipRow
                label='Modules'
                options={SERVICENOW_JOB_MODULES}
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage className='text-xs' />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name='certifications'
        render={({ field }) => (
          <FormItem className='space-y-0'>
            <FormControl>
              <TaxonomyChipRow
                label='Certifications'
                options={SERVICENOW_JOB_CERTIFICATIONS}
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage className='text-xs' />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name='skills'
        render={({ field }) => (
          <FormItem className='space-y-0'>
            <FormControl>
              <TaxonomyChipRow
                label='Skills'
                options={SERVICENOW_JOB_SKILLS}
                value={field.value}
                onChange={field.onChange}
                chipVariant='secondary'
              />
            </FormControl>
            <FormMessage className='text-xs' />
          </FormItem>
        )}
      />
    </div>
  )
}
