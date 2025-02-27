import { FC, useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { supabase } from '../lib/supabaseClient'

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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: username, color: userColor },
      }),
    ],
    content: '', // Start empty; we load from Supabase below.
    immediatelyRender: false,
  })

  // Load saved document content from Supabase.
  useEffect(() => {
    async function loadDocument() {
      if (!docId || typeof docId !== 'string') return
      const { data, error } = await supabase
        .from('documents')
        .select('content')
        .eq('id', docId)
        .single()
      if (error) console.error('Error loading document:', error)
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

  // Debounce live save: auto-save 3 seconds after the last update.
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const saveDocument = async () => {
    if (!editor || !docId || typeof docId !== 'string') return
    const content = editor.getHTML()
    const { error } = await supabase
      .from('documents')
      .upsert({ id: docId, content }, { onConflict: 'id' })
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

  // Toggle dark mode: This button now has a bright background to be clearly visible.
  const toggleDarkMode = () => {
    const root = document.documentElement
    if (root.classList.contains('dark')) {
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
    }
  }

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-fg">
      <div className="container mx-auto p-6 font-sans">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Calpiko Editor</h1>
          <div className="space-x-2">
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 bg-yellow-500 text-black rounded shadow"
            >
              Toggle Light/Dark Mode
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
      </div>
    </div>
  )
}

export default DocumentEditor
