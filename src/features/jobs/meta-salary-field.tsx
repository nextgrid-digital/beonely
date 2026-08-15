import type { UseFormReturn } from 'react-hook-form'
import { JOB_SALARY_CURRENCIES } from '@/lib/jobs/salary-range-format'
import { cn } from '@/lib/utils'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { META_CONTROL } from '@/features/jobs/job-listing-meta-control'
import type { JobEditorValues } from '@/features/recruiter/recruiter-job-editor-page'

const SALARY_GROUP = cn(
  META_CONTROL,
  'flex h-7 w-auto max-w-[16rem] items-stretch gap-0 overflow-hidden p-0'
)

const CURRENCY_TRIGGER = cn(
  'h-7 w-[4.25rem] shrink-0 rounded-none border-0 border-r border-border',
  'bg-muted/40 px-2 text-xs shadow-none',
  'focus-visible:border-border focus-visible:ring-0'
)

const AMOUNT_INPUT = cn(
  'h-7 min-w-[7rem] flex-1 border-0 bg-transparent px-2 text-xs shadow-none',
  'rounded-none focus-visible:ring-0 focus-visible:ring-offset-0'
)

export function MetaSalaryField(props: {
  form: UseFormReturn<JobEditorValues>
}) {
  const { form } = props
  const currencyError = form.formState.errors.salary_currency?.message
  const amountError = form.formState.errors.salary_amount?.message
  const errorMessage =
    typeof currencyError === 'string'
      ? currencyError
      : typeof amountError === 'string'
        ? amountError
        : null

  return (
    <div className='space-y-0'>
      <FormLabel className='sr-only'>Salary</FormLabel>
      <div className={SALARY_GROUP}>
        <FormField
          control={form.control}
          name='salary_currency'
          render={({ field }) => (
            <FormItem className='space-y-0'>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger
                    size='sm'
                    className={cn(CURRENCY_TRIGGER, '!h-7 data-[size=sm]:!h-7')}
                    aria-label='Currency'
                  >
                    <SelectValue placeholder='INR'>
                      {field.value || 'INR'}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent align='start'>
                  {JOB_SALARY_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='salary_amount'
          render={({ field }) => (
            <FormItem className='min-w-0 flex-1 space-y-0'>
              <FormControl>
                <Input
                  {...field}
                  placeholder='12–24 LPA'
                  className={AMOUNT_INPUT}
                  aria-label='Salary amount'
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      {errorMessage ? (
        <p className='mt-1 text-xs text-destructive' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
