import { FC, useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { supabase } from '../lib/supabaseClient'
import MarkdownRenderer from './MarkdownRenderer'

interface DocumentEditorProps {
  docId: string | string[] | undefined
}

const DocumentEditor: FC<DocumentEditorProps> = ({ docId }) => {
  // Create a new Yjs document.
  const ydoc = new Y.Doc()

  // Connect to the Yjs WebSocket server.
  const provider = new WebsocketProvider(
    'ws://localhost:1234',
    typeof docId === 'string' ? docId : 'default-room',
    ydoc
  )

  const [username] = useState('User' + Math.floor(Math.random() * 1000))
  const [userColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16))
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [showPreview, setShowPreview] = useState<boolean>(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: username, color: userColor },
      }),
    ],
    content: '', // Content will be loaded from Supabase.
    immediatelyRender: false,
  })

  // Load saved document from Supabase.
  useEffect(() => {
    async function loadDocument() {
      if (!docId || typeof docId !== 'string') return
      const { data, error } = await supabase
        .from('documents')
        .select('content')
        .eq('id', docId)
        .maybeSingle()
      if (error) {
        console.error('Error loading document:', error)
      }
      const initialContent = data?.content || '## Welcome to your Document!\n\nStart editing...'
      const yText = ydoc.getText('prosemirror')
      if (yText.length === 0) {
        yText.insert(0, initialContent)
      }
    }
    loadDocument()
  }, [docId, ydoc])

  // Auto-focus the editor on mount.
  useEffect(() => {
    if (editor) {
      editor.commands.focus()
    }
  }, [editor])

  // Debounce live-save: auto-save 3 seconds after last update.
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const saveDocument = async () => {
    if (!editor || !docId || typeof docId !== 'string') return
    const newContent = editor.getHTML()
    const { error } = await supabase
      .from('documents')
      .upsert({ id: docId, content: newContent }, { onConflict: 'id' })
    if (error) {
      setSaveStatus('Error saving document.')
      console.error(error)
    } else {
      setSaveStatus('Document saved!')
      setTimeout(() => setSaveStatus(''), 2000)
    }
  }
  const debouncedSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveDocument()
    }, 3000)
  }
  useEffect(() => {
    if (!editor) return
    editor.on('update', debouncedSave)
    return () => {
      editor.off('update', debouncedSave)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [editor])

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-fg">
      <div className="container mx-auto p-6 font-sans">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Calpiko Editor</h1>
          <div className="space-x-2">
            <button
              onClick={() => setShowPreview((prev) => !prev)}
              className="px-4 py-2 bg-blue-600 text-white rounded shadow"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button
              onClick={saveDocument}
              className="px-4 py-2 bg-green-600 text-white rounded shadow"
            >
              Save Now
            </button>
          </div>
        </div>
        {saveStatus && <p className="mb-2 text-sm">{saveStatus}</p>}
        <div className="border border-obsidian-border bg-[#44475a] p-4 min-h-[400px] rounded">
          <EditorContent editor={editor} />
        </div>
        {showPreview && (
          <div className="mt-6 border border-obsidian-border bg-[#44475a] p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Preview</h2>
            <MarkdownRenderer content={editor ? editor.getHTML() : ''} />
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentEditor
