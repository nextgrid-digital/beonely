import type { ChangeEventHandler, RefObject } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  companyInitials,
  trustedCompanyLogoUrl,
} from '@/features/jobs/company-logo-avatar'
import { JobDescriptionRichTextField } from '@/features/jobs/job-description-rich-text-field'
import { JobListingMetaEditor } from '@/features/jobs/job-listing-meta-editor'
import {
  JobListingAboutSection,
  JobListingShell,
} from '@/features/jobs/job-listing-shell'
import type { JobEditorValues } from '@/features/recruiter/recruiter-job-editor-page'

const INLINE_INPUT = cn(
  'h-auto border-0 bg-transparent px-0 shadow-none',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
  'rounded-sm placeholder:text-muted-foreground'
)

export function JobListingInlineEditor(props: {
  form: UseFormReturn<JobEditorValues>
  logoInputRef: RefObject<HTMLInputElement | null>
  onLogoFileChange: ChangeEventHandler<HTMLInputElement>
  clearLogo: () => void
  logoBusy: boolean
  hasPendingLogo: boolean
}) {
  const {
    form,
    logoInputRef,
    onLogoFileChange,
    clearLogo,
    logoBusy,
    hasPendingLogo,
  } = props
  const companyName = form.watch('company')
  const logoPreviewUrl = trustedCompanyLogoUrl(form.watch('company_logo'), {
    allowLocalPreview: true,
  })

  return (
    <JobListingShell
      logo={
        <div className='flex flex-col items-center gap-2'>
          <Avatar className='size-14 rounded-md border border-border/60 bg-muted/30'>
            {logoPreviewUrl ? (
              <AvatarImage
                src={logoPreviewUrl}
                alt={`${companyName || 'Company'} logo`}
                className='object-cover'
              />
            ) : null}
            <AvatarFallback className='rounded-md text-sm font-semibold uppercase'>
              {companyInitials(companyName || 'Co')}
            </AvatarFallback>
          </Avatar>
          <input
            ref={logoInputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            className='sr-only'
            onChange={onLogoFileChange}
          />
          <div className='flex flex-col gap-1'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              disabled={logoBusy}
              onClick={() => logoInputRef.current?.click()}
            >
              {logoBusy ? 'Uploading…' : 'Logo'}
            </Button>
            {(logoPreviewUrl || hasPendingLogo) && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-8 text-xs'
                onClick={clearLogo}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      }
      title={
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem className='space-y-0'>
              <FormLabel className='sr-only'>Job title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder='Senior ServiceNow Developer'
                  className={cn(
                    INLINE_INPUT,
                    'text-xl font-semibold tracking-tight'
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      }
      company={
        <FormField
          control={form.control}
          name='company'
          render={({ field }) => (
            <FormItem className='mt-1 space-y-0'>
              <FormLabel className='sr-only'>Company</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder='Company name'
                  className={cn(INLINE_INPUT, 'text-sm text-muted-foreground')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      }
      meta={<JobListingMetaEditor form={form} className='mt-3' />}
      body={
        <JobListingAboutSection>
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem className='min-w-0 space-y-2'>
                <FormDescription className='sr-only'>
                  Job description
                </FormDescription>
                <FormControl>
                  <JobDescriptionRichTextField
                    value={field.value}
                    onChange={field.onChange}
                    editable
                    variant='inline'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </JobListingAboutSection>
      }
    />
  )
}
