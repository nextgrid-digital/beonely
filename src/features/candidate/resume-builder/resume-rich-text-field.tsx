import { useEffect } from 'react'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { DOMParser as PMDOMParser } from '@tiptap/pm/model'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-react'
import {
  normalizePastedResumeHtml,
  plainTextResumePasteToHtml,
} from '@/lib/candidate/normalize-pasted-resume-html'
import {
  looksLikeResumeHtml,
  sanitizeResumeHtml,
} from '@/lib/candidate/sanitize-resume-html'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Read.cv-style paragraph rhythm (Inter regular, #555, open leading, pre-wrap). */
const RICH_READ_BODY =
  'antialiased whitespace-pre-wrap text-left break-words tracking-normal font-normal text-[rgb(85,85,85)] leading-[1.8] [font-variation-settings:normal]'

const RICH_CONTENT_CLASS = cn(
  'min-h-[4.5rem] text-sm',
  RICH_READ_BODY,
  '[&_p]:my-0 [&_p]:block [&_p]:whitespace-pre-wrap [&_p+_p]:mt-4',
  '[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_a]:text-slate-800 [&_a]:underline'
)

export function contentFromResumeRichValue(value: string): string {
  const t = value.trim()
  if (!t) return '<p></p>'
  if (looksLikeResumeHtml(t)) return sanitizeResumeHtml(t)
  return plainTextToInitialHtml(t)
}

function plainTextToInitialHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  if (!escaped) return '<p></p>'
  return `<p>${escaped.split('\n').join('<br />')}</p>`
}

export function ResumeRichTextRead({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (looksLikeResumeHtml(trimmed)) {
    const safe = sanitizeResumeHtml(trimmed)
    return (
      <div
        className={cn(RICH_CONTENT_CLASS, className)}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    )
  }
  return <p className={cn(RICH_CONTENT_CLASS, className)}>{value}</p>
}

export type ResumeRichTextFieldProps = {
  value: string
  onChange: (html: string) => void
  editable: boolean
  className?: string
  editorClassName?: string
}

/**
 * Rich text for resume summary / item descriptions (Tiptap when editing, sanitized HTML or plain text when viewing).
 */
export function ResumeRichTextField({
  value,
  onChange,
  editable,
  className,
  editorClassName,
}: ResumeRichTextFieldProps) {
  if (!editable) {
    return <ResumeRichTextRead value={value} className={className} />
  }
  return (
    <ResumeRichTextEdit
      value={value}
      onChange={onChange}
      className={className}
      editorClassName={editorClassName}
    />
  )
}

function ResumeRichTextEdit({
  value,
  onChange,
  className,
  editorClassName,
}: Omit<ResumeRichTextFieldProps, 'editable'>) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
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
    content: contentFromResumeRichValue(value),
    editorProps: {
      attributes: {
        class: cn(
          'outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2',
          RICH_CONTENT_CLASS,
          editorClassName
        ),
      },
      transformPastedHTML(html) {
        return normalizePastedResumeHtml(html)
      },
      handlePaste(view, event) {
        const cd = event.clipboardData
        if (!cd) return false
        const htmlRaw = cd.getData('text/html')?.trim() ?? ''
        if (htmlRaw.length > 0 && htmlRaw.includes('<')) return false
        const plain = cd.getData('text/plain')
        if (!plain || !plain.includes('\n')) return false
        event.preventDefault()
        const safe = sanitizeResumeHtml(plainTextResumePasteToHtml(plain))
        const dom = document.createElement('div')
        dom.innerHTML = safe
        try {
          const parser = PMDOMParser.fromSchema(view.state.schema)
          const slice = parser.parseSlice(dom, { preserveWhitespace: true })
          view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView())
        } catch {
          return false
        }
        return true
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeResumeHtml(ed.getHTML()))
    },
  })

  useEffect(() => {
    if (!editor) return
    const next = contentFromResumeRichValue(value)
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
          'min-h-[4.5rem] rounded-md border border-slate-200 bg-white/50',
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn('rounded-md border border-slate-200 bg-white', className)}
    >
      <div className='flex flex-wrap gap-0.5 border-b border-slate-100 bg-slate-50/80 p-1'>
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
