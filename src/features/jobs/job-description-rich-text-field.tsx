import { useEffect } from 'react'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
} from 'lucide-react'
import {
  contentFromJobDescriptionRichValue,
  looksLikeJobHtml,
  sanitizeJobDescriptionHtml,
} from '@/lib/jobs/sanitize-job-description-html'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const JOB_EDITOR_BODY =
  'antialiased whitespace-pre-wrap text-left break-words text-sm text-foreground leading-relaxed [font-variation-settings:normal]'

const JOB_EDITOR_CONTENT_CLASS = cn(
  'max-h-[min(32rem,50vh)] min-h-[12rem] overflow-y-auto',
  JOB_EDITOR_BODY,
  '[&_p]:my-0 [&_p]:block [&_p+_p]:mt-3',
  '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground',
  '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
  '[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_a]:text-primary [&_a]:underline'
)

const JOB_READ_CLASS = cn(
  'max-w-none min-w-0 text-sm leading-relaxed text-foreground',
  '[&_p]:my-0 [&_p+_p]:mt-3',
  '[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight',
  '[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
  '[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_a]:text-primary [&_a]:underline'
)

export function JobDescriptionRichTextRead({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (looksLikeJobHtml(trimmed)) {
    const safe = sanitizeJobDescriptionHtml(trimmed)
    return (
      <div
        className={cn(JOB_READ_CLASS, className)}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    )
  }
  return (
    <div className={cn(JOB_READ_CLASS, 'whitespace-pre-wrap', className)}>
      {value}
    </div>
  )
}

export type JobDescriptionRichTextFieldProps = {
  value: string
  onChange: (html: string) => void
  editable: boolean
  className?: string
  editorClassName?: string
}

/**
 * Rich text for job descriptions (Tiptap when editing; sanitized HTML or plain when reading).
 */
export function JobDescriptionRichTextField({
  value,
  onChange,
  editable,
  className,
  editorClassName,
}: JobDescriptionRichTextFieldProps) {
  if (!editable) {
    return <JobDescriptionRichTextRead value={value} className={className} />
  }
  return (
    <JobDescriptionRichTextEdit
      value={value}
      onChange={onChange}
      className={className}
      editorClassName={editorClassName}
    />
  )
}

function JobDescriptionRichTextEdit({
  value,
  onChange,
  className,
  editorClassName,
}: Omit<JobDescriptionRichTextFieldProps, 'editable'>) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'underline',
        },
      }),
    ],
    content: contentFromJobDescriptionRichValue(value),
    editorProps: {
      attributes: {
        class: cn(
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
          JOB_EDITOR_CONTENT_CLASS,
          editorClassName
        ),
      },
      transformPastedHTML(html) {
        return sanitizeJobDescriptionHtml(html)
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeJobDescriptionHtml(ed.getHTML()))
    },
  })

  useEffect(() => {
    if (!editor) return
    const next = contentFromJobDescriptionRichValue(value)
    const cur = editor.getHTML()
    if (cur === next) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  const setLink = () => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev ?? 'https://')
    if (url === null) return
    const t = url.trim()
    if (t === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: t }).run()
  }

  if (!editor) {
    return (
      <div
        className={cn(
          'min-h-[12rem] rounded-md border border-border bg-muted/20',
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-background motion-reduce:transition-none',
        className
      )}
    >
      <div className='flex flex-wrap gap-0.5 border-b border-border bg-muted/30 p-1'>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Bold'
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Italic'
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Underline'
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Heading 2'
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Heading 3'
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Quote'
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Bullet list'
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Numbered list'
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          aria-label='Link'
          onClick={setLink}
        >
          <LinkIcon className='size-4' />
        </Button>
      </div>
      <div className='px-3 py-2'>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
