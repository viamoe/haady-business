'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Unlink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useState } from 'react'
import { Button } from './button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'
import { Input } from './input'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  dir?: 'ltr' | 'rtl'
  className?: string
  disabled?: boolean
  minHeight?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  dir = 'ltr',
  className,
  disabled = false,
  minHeight = '120px',
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)

  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: false, // Disable headings for product descriptions
        codeBlock: false, // Disable code blocks
        code: false, // Disable inline code
        blockquote: false, // Disable blockquotes
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#F4610B] underline hover:text-[#E5550A] cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: dir === 'rtl' ? 'right' : 'left',
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2',
          dir === 'rtl' && 'text-right',
        ),
        dir,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Return empty string if editor is empty (only has empty paragraph)
      if (html === '<p></p>' || html === '<p dir="rtl"></p>' || html === '<p dir="ltr"></p>') {
        onChange('')
      } else {
        onChange(html)
      }
    },
  })

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Don't update if both are essentially empty
      const editorHtml = editor.getHTML()
      const isEditorEmpty = editorHtml === '<p></p>' || editorHtml === '<p dir="rtl"></p>' || editorHtml === '<p dir="ltr"></p>'
      const isValueEmpty = !value || value === '' || value === '<p></p>'
      
      if (isEditorEmpty && isValueEmpty) return
      
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  // Update text direction when dir prop changes
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: cn(
              'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2',
              dir === 'rtl' && 'text-right',
            ),
            dir,
          },
        },
      })
      // Set default alignment based on direction
      if (dir === 'rtl') {
        editor.chain().focus().setTextAlign('right').run()
      }
    }
  }, [dir, editor])

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return
    
    // Add https if no protocol specified
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run()
    
    setLinkUrl('')
    setIsLinkPopoverOpen(false)
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
  }, [editor])

  if (!editor) {
    return (
      <div 
        className={cn(
          'w-full rounded-md border border-border bg-transparent animate-pulse',
          className
        )}
        style={{ minHeight }}
      />
    )
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false,
    children,
    title,
  }: { 
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-all duration-150',
        'hover:bg-gray-100 active:bg-gray-200',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        isActive && 'bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20',
      )}
    >
      {children}
    </button>
  )

  return (
    <div 
      className={cn(
        'w-full rounded-md border border-border bg-transparent overflow-hidden',
        'focus-within:ring-2 focus-within:ring-[#F4610B]/20 focus-within:border-[#F4610B]/50',
        'transition-all duration-200',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      {/* Toolbar */}
      <div 
        className={cn(
          'flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-gray-50/50',
          'flex-wrap'
        )}
      >
        {/* Text Formatting */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            disabled={disabled}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            disabled={disabled}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            disabled={disabled}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            disabled={disabled}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            disabled={disabled}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            disabled={disabled}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            disabled={disabled}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            disabled={disabled}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Link */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                title="Add Link"
                className={cn(
                  'p-1.5 rounded-md transition-all duration-150',
                  'hover:bg-gray-100 active:bg-gray-200',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                  editor.isActive('link') && 'bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20',
                )}
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">URL</label>
                <div className="flex gap-2">
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addLink()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addLink}
                    disabled={!linkUrl}
                    className="h-8 bg-[#F4610B] hover:bg-[#E5550A]"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {editor.isActive('link') && (
            <ToolbarButton
              onClick={removeLink}
              disabled={disabled}
              title="Remove Link"
            >
              <Unlink className="h-4 w-4" />
            </ToolbarButton>
          )}
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pl-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className={cn(
          'overflow-auto overflow-x-hidden',
          disabled && 'pointer-events-none',
        )}
        style={{ minHeight }}
      />

      {/* Custom styles for the editor */}
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror p:first-child {
          margin-top: 0;
        }
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .ProseMirror ul {
          padding-left: 1.5em;
          padding-right: 0;
          margin: 0.5em 0;
          list-style-type: disc;
        }
        .ProseMirror ol {
          padding-left: 1.5em;
          padding-right: 0;
          margin: 0.5em 0;
          list-style-type: decimal;
        }
        .ProseMirror[dir="rtl"] ul,
        .ProseMirror[dir="rtl"] ol {
          padding-left: 0;
          padding-right: 2em;
          margin-right: 0;
        }
        .ProseMirror[dir="rtl"] li {
          direction: rtl;
          text-align: right;
        }
        .ProseMirror ul ul {
          list-style-type: circle;
        }
        .ProseMirror ul ul ul {
          list-style-type: square;
        }
        .ProseMirror li {
          margin: 0.25em 0;
          display: list-item;
        }
        .ProseMirror li p {
          margin: 0;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror[dir="rtl"] p.is-editor-empty:first-child::before {
          float: right;
        }
        .ProseMirror strong {
          font-weight: 600;
        }
        .ProseMirror em {
          font-style: italic;
        }
        .ProseMirror u {
          text-decoration: underline;
        }
        .ProseMirror a {
          color: #F4610B;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror a:hover {
          color: #E5550A;
        }
      `}</style>
    </div>
  )
}

