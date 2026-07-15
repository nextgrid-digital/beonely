import { useEffect, useId } from 'react'
import Link from '@tiptap/extension-link'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from 'lucide-react'
import { sanitizeJobDescriptionHtml } from '@/lib/jobs/sanitize-job-description-html'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const EDITOR_CLASS = cn(
  'max-h-[min(24rem,40vh)] min-h-[10rem] overflow-y-auto text-sm leading-relaxed',
  '[&_p]:my-0 [&_p+_p]:mt-3',
  '[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold',
  '[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_a]:text-primary [&_a]:underline'
)

export function EmailBodyRichTextField({
  id,
  ariaLabel = 'Email body',
  value,
  onChange,
  disabled,
}: {
  id?: string
  ariaLabel?: string
  value: string
  onChange: (html: string) => void
  disabled?: boolean
}) {
  const generatedId = useId()
  const editorId = id ?? generatedId
  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeJobDescriptionHtml(ed.getHTML()))
    },
    editorProps: {
      attributes: {
        id: editorId,
        role: 'textbox',
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        class: EDITOR_CLASS,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const cur = editor.getHTML()
    const next = value || '<p></p>'
    if (cur !== next) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  const setLink = () => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const href = window.prompt('Link URL', prev ?? 'https://')
    if (href === null) return
    const t = href.trim()
    if (!t) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: t }).run()
  }

  if (!editor) return null

  return (
    <div className='rounded-md border border-border'>
      {!disabled ? (
        <div
          role='toolbar'
          aria-label={`${ariaLabel} formatting`}
          aria-controls={editorId}
          className='flex flex-wrap gap-1 border-b border-border p-2'
        >
          <Button
            type='button'
            size='icon'
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            className='size-8'
            aria-label='Bold'
            aria-pressed={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className='size-4' aria-hidden />
          </Button>
          <Button
            type='button'
            size='icon'
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            className='size-8'
            aria-label='Italic'
            aria-pressed={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className='size-4' aria-hidden />
          </Button>
          <Button
            type='button'
            size='icon'
            variant={
              editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'
            }
            className='size-8'
            aria-label='Heading level 2'
            aria-pressed={editor.isActive('heading', { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className='size-4' aria-hidden />
          </Button>
          <Button
            type='button'
            size='icon'
            variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
            className='size-8'
            aria-label='Bullet list'
            aria-pressed={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className='size-4' aria-hidden />
          </Button>
          <Button
            type='button'
            size='icon'
            variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
            className='size-8'
            aria-label='Numbered list'
            aria-pressed={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className='size-4' aria-hidden />
          </Button>
          <Button
            type='button'
            size='icon'
            variant={editor.isActive('link') ? 'secondary' : 'ghost'}
            className='size-8'
            aria-label='Add or edit link'
            aria-pressed={editor.isActive('link')}
            onClick={setLink}
          >
            <LinkIcon className='size-4' aria-hidden />
          </Button>
        </div>
      ) : null}
      <div className='p-3'>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
