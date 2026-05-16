import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

type MarketingOptInCheckboxProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
}

export function MarketingOptInCheckbox({
  checked,
  onCheckedChange,
  disabled,
  id = 'marketing-opt-in',
}: MarketingOptInCheckboxProps) {
  return (
    <div className='flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3'>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className='mt-0.5'
      />
      <div className='grid gap-1'>
        <Label htmlFor={id} className='cursor-pointer font-normal leading-snug'>
          Send me job alerts and product updates
        </Label>
        <p className='text-xs text-muted-foreground'>
          Optional marketing emails. You can unsubscribe anytime. Account emails
          (applications, payments) are separate.
        </p>
      </div>
    </div>
  )
}
