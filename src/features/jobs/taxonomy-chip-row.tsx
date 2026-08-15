import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  sortTaxonomyLabels,
  toggleInList,
} from '@/lib/jobs/servicenow-job-taxonomy'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function appendTaxonomyOption(
  value: string[],
  option: string,
  catalog: readonly string[]
): string[] {
  if (value.includes(option)) return value
  return sortTaxonomyLabels([...value, option], catalog)
}

export function TaxonomyChipRow(props: {
  label: string
  options: readonly string[]
  value: string[]
  onChange: (next: string[]) => void
  chipVariant?: 'outline' | 'secondary'
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = sortTaxonomyLabels(props.value, props.options)
  const available = props.options.filter((o) => !props.value.includes(o))

  const addOption = (option: string) => {
    const next = appendTaxonomyOption(props.value, option, props.options)
    if (next === props.value) return
    props.onChange(next)
    setOpen(false)
  }

  const removeOption = (option: string) => {
    props.onChange(toggleInList(props.value, option))
  }

  return (
    <div className={cn('space-y-1.5', props.className)}>
      <p className='text-xs font-medium text-muted-foreground'>{props.label}</p>
      <div className='flex flex-wrap items-center gap-1.5'>
        {selected.map((item) => (
          <Badge
            key={item}
            variant={props.chipVariant ?? 'outline'}
            className='gap-1 pe-1'
          >
            {item}
            <button
              type='button'
              disabled={props.disabled}
              className='rounded-full ring-offset-background outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none'
              aria-label={`Remove ${item}`}
              onClick={() => removeOption(item)}
            >
              <X className='size-3 opacity-70 hover:opacity-100' />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='size-7 shrink-0 rounded-full'
              disabled={props.disabled || available.length === 0}
              aria-label={`Add ${props.label}`}
            >
              <Plus className='size-3.5' />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-64 p-0' align='start'>
            <Command>
              <CommandInput
                placeholder={`Search ${props.label.toLowerCase()}…`}
              />
              <CommandList>
                <CommandEmpty>No options left.</CommandEmpty>
                <CommandGroup>
                  {available.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => addOption(option)}
                    >
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
