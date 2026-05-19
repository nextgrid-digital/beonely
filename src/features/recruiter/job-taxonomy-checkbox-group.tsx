import { toggleInList } from '@/lib/jobs/servicenow-job-taxonomy'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export function JobTaxonomyCheckboxGroup(props: {
  id: string
  label: string
  description?: string
  options: readonly string[]
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const selectedCount = props.value.length

  return (
    <fieldset className='space-y-3' disabled={props.disabled}>
      <legend className='text-sm font-medium leading-none'>
        {props.label}
        {selectedCount > 0 ? (
          <span className='ms-2 font-normal text-muted-foreground'>
            ({selectedCount} selected)
          </span>
        ) : null}
      </legend>
      {props.description ? (
        <p className='text-sm text-muted-foreground'>{props.description}</p>
      ) : null}
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
        {props.options.map((option) => {
          const inputId = `${props.id}-${option.replace(/\s+/g, '-')}`
          const checked = props.value.includes(option)
          return (
            <div
              key={option}
              className={cn(
                'flex items-center gap-2 rounded-md border border-border/60 px-3 py-2',
                checked && 'border-primary/40 bg-primary/[0.03]'
              )}
            >
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={() => {
                  props.onChange(toggleInList(props.value, option))
                }}
              />
              <Label
                htmlFor={inputId}
                className='cursor-pointer text-sm font-normal leading-snug'
              >
                {option}
              </Label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
