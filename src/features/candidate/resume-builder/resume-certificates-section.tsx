import {
  useId,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  Award,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { safeCandidateCertificateSignedUrl } from '@/lib/candidate/certificate-assets'
import type {
  ResumeContentItem,
  ResumeStructuredV1,
} from '@/lib/candidate/resume-structured-schema'
import type { CandidateCertificateUpload } from '@/lib/candidate/upload-candidate-certificate'
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
  filePath: '',
})

const INLINE =
  'border-0 bg-transparent p-0 shadow-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-0 w-full min-w-0 rounded-sm placeholder:text-slate-400'

type ResumeCertificatesSectionProps = {
  items: ResumeContentItem[]
  sectionIndex: number
  mode: 'view' | 'edit'
  onDraftChange?: Dispatch<SetStateAction<ResumeStructuredV1>>
  onUpload?: (file: File) => Promise<CandidateCertificateUpload>
}

export function ResumeCertificatesSection({
  items,
  sectionIndex,
  mode,
  onDraftChange,
  onUpload,
}: ResumeCertificatesSectionProps) {
  const edit = mode === 'edit' && Boolean(onDraftChange)

  if (!edit) {
    const visible = items.filter(
      (i) => i.title.trim() || i.fileUrl.trim() || i.filePath.trim()
    )
    if (visible.length === 0) return null
    return (
      <div className='flex flex-col gap-3'>
        {visible.map((item, i) => {
          const name = item.title.trim() || 'Certificate'
          const href = safeCandidateCertificateSignedUrl(item.fileUrl)
          return (
            <div key={i} className='flex items-center gap-2 text-sm'>
              <Award className='size-4 shrink-0 text-slate-500' aria-hidden />
              {href ? (
                <a
                  href={href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1 font-medium text-slate-900 hover:underline'
                >
                  {name}
                  <ExternalLink
                    className='size-3 shrink-0 opacity-70'
                    aria-hidden
                  />
                </a>
              ) : (
                <span className='font-medium text-slate-900'>{name}</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (!onDraftChange) return null

  const setItemField = (
    itemIndex: number,
    patch: Partial<ResumeContentItem>
  ) => {
    onDraftChange((d) => {
      const sections = [...d.sections]
      const cur = sections[sectionIndex]
      if (!cur) return d
      const nextItems = [...cur.items]
      nextItems[itemIndex] = { ...nextItems[itemIndex], ...patch }
      sections[sectionIndex] = { ...cur, items: nextItems }
      return { ...d, sections }
    })
  }

  const removeItem = (itemIndex: number) => {
    onDraftChange((d) => {
      const sections = [...d.sections]
      const cur = sections[sectionIndex]
      if (!cur) return d
      sections[sectionIndex] = {
        ...cur,
        items: cur.items.filter((_, j) => j !== itemIndex),
      }
      return { ...d, sections }
    })
  }

  const addItem = () => {
    onDraftChange((d) => {
      const sections = [...d.sections]
      const cur = sections[sectionIndex]
      if (!cur) return d
      sections[sectionIndex] = { ...cur, items: [...cur.items, emptyItem()] }
      return { ...d, sections }
    })
  }

  return (
    <div className='flex flex-col gap-4'>
      {items.map((item, itemIndex) => (
        <CertificateEditRow
          key={itemIndex}
          item={item}
          onNameChange={(v) => setItemField(itemIndex, { title: v })}
          onFileUrlChange={(v) => setItemField(itemIndex, { fileUrl: v })}
          onFilePathChange={(v) => setItemField(itemIndex, { filePath: v })}
          onRemove={() => removeItem(itemIndex)}
          onUpload={onUpload}
        />
      ))}
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='w-fit'
        onClick={addItem}
      >
        <Plus className='mr-1 size-4' />
        Add certificate
      </Button>
    </div>
  )
}

function CertificateEditRow({
  item,
  onNameChange,
  onFileUrlChange,
  onFilePathChange,
  onRemove,
  onUpload,
}: {
  item: ResumeContentItem
  onNameChange: (value: string) => void
  onFileUrlChange: (value: string) => void
  onFilePathChange: (value: string) => void
  onRemove: () => void
  onUpload?: (file: File) => Promise<CandidateCertificateUpload>
}) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const href = safeCandidateCertificateSignedUrl(item.fileUrl)

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return
    if (!onUpload) {
      toast.error('File upload is unavailable right now.')
      return
    }
    setUploading(true)
    try {
      const uploaded = await onUpload(file)
      onFilePathChange(uploaded.filePath)
      onFileUrlChange(uploaded.fileUrl)
      toast.success('Certificate uploaded')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not upload certificate'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className='group/cert flex items-start gap-3 rounded-md border border-slate-200 p-3'>
      <Award className='mt-1 size-4 shrink-0 text-slate-500' aria-hidden />
      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <Input
          aria-label='Certificate name'
          placeholder='Certificate name (e.g. ServiceNow CSA)'
          value={item.title}
          onChange={(e) => onNameChange(e.target.value)}
          className={`${INLINE} font-medium`}
        />
        <div className='flex flex-wrap items-center gap-2'>
          <input
            ref={fileRef}
            id={inputId}
            type='file'
            accept='image/jpeg,image/png,image/webp,application/pdf'
            className='sr-only'
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              void onFileSelected(file)
            }}
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className='mr-1 size-4 animate-spin' aria-hidden />
            ) : (
              <Upload className='mr-1 size-4' aria-hidden />
            )}
            {uploading ? 'Uploading…' : href ? 'Replace file' : 'Upload file'}
          </Button>
          {href ? (
            <a
              href={href}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-sm text-slate-600 hover:underline'
            >
              View file
              <ExternalLink className='size-3 opacity-70' aria-hidden />
            </a>
          ) : (
            <span className='text-xs text-slate-400'>
              JPG, PNG, WebP, or PDF (max 10 MB)
            </span>
          )}
        </div>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='shrink-0 text-destructive opacity-0 transition-opacity group-hover/cert:opacity-100'
        aria-label='Remove certificate'
        onClick={onRemove}
      >
        <Trash2 className='size-4' />
      </Button>
    </div>
  )
}
