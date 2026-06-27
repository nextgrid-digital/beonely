import { useState, type Dispatch, type SetStateAction } from 'react'
import { Plus, X } from 'lucide-react'
import type {
  ResumeContentItem,
  ResumeStructuredV1,
} from '@/lib/candidate/resume-structured-schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const emptyItem = (): ResumeContentItem => ({
  title: '',
  company: '',
  location: '',
  college: '',
  state: '',
  country: '',
  subTitle: '',
  date: '',
  description: '',
  fileUrl: '',
})

/** Non-empty, trimmed chip labels from a section's items (`item.title`). */
function chipLabels(items: ResumeContentItem[]): string[] {
  return items.map((i) => i.title.trim()).filter(Boolean)
}

function hasChip(items: ResumeContentItem[], value: string): boolean {
  const v = value.trim().toLowerCase()
  return items.some((i) => i.title.trim().toLowerCase() === v)
}

type ResumeChipSectionProps = {
  items: ResumeContentItem[]
  sectionIndex: number
  suggestions: readonly string[]
  mode: 'view' | 'edit'
  onDraftChange?: Dispatch<SetStateAction<ResumeStructuredV1>>
}

export function ResumeChipSection({
  items,
  sectionIndex,
  suggestions,
  mode,
  onDraftChange,
}: ResumeChipSectionProps) {
  const edit = mode === 'edit' && Boolean(onDraftChange)
  const [pending, setPending] = useState('')

  const labels = chipLabels(items)

  if (!edit) {
    if (labels.length === 0) return null
    return (
      <div className='flex flex-wrap gap-2'>
        {labels.map((label, i) => (
          <Badge key={`${label}-${i}`} variant='secondary'>
            {label}
          </Badge>
        ))}
      </div>
    )
  }

  if (!onDraftChange) return null

  const addChip = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    onDraftChange((d) => {
      const sections = [...d.sections]
      const current = sections[sectionIndex]
      if (!current || hasChip(current.items, value)) return d
      sections[sectionIndex] = {
        ...current,
        items: [...current.items, { ...emptyItem(), title: value }],
      }
      return { ...d, sections }
    })
  }

  const removeChipAt = (titleIndex: number) => {
    onDraftChange((d) => {
      const sections = [...d.sections]
      const current = sections[sectionIndex]
      if (!current) return d
      sections[sectionIndex] = {
        ...current,
        items: current.items.filter((_, j) => j !== titleIndex),
      }
      return { ...d, sections }
    })
  }

  const commitPending = () => {
    if (!pending.trim()) return
    addChip(pending)
    setPending('')
  }

  const availableSuggestions = suggestions.filter(
    (s) => !hasChip(items, s)
  )

  return (
    <div className='flex flex-col gap-3'>
      {items.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {items.map((item, itemIndex) => {
            const label = item.title.trim()
            if (!label) return null
            return (
              <Badge key={itemIndex} variant='secondary' className='pr-1'>
                {label}
                <button
                  type='button'
                  aria-label={`Remove ${label}`}
                  className='ml-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  onClick={() => removeChipAt(itemIndex)}
                >
                  <X className='size-3' />
                </button>
              </Badge>
            )
          })}
        </div>
      ) : null}

      <div className='flex max-w-sm items-center gap-2'>
        <Input
          value={pending}
          placeholder='Add custom…'
          autoCapitalize='off'
          autoCorrect='off'
          spellCheck={false}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitPending()
            }
          }}
          className='h-8'
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='shrink-0'
          disabled={!pending.trim()}
          onClick={commitPending}
        >
          <Plus className='size-4' />
          Add
        </Button>
      </div>

      {availableSuggestions.length > 0 ? (
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='mr-1 text-xs text-muted-foreground'>Suggestions:</span>
          {availableSuggestions.map((s) => (
            <button key={s} type='button' onClick={() => addChip(s)}>
              <Badge
                variant='outline'
                className='cursor-pointer hover:bg-accent hover:text-accent-foreground'
              >
                <Plus className='size-3' />
                {s}
              </Badge>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
