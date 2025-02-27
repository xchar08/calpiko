import { FC, useState, useEffect, useRef } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { supabase } from '../lib/supabaseClient'
import MarkdownRenderer from './MarkdownRenderer'

interface DocumentEditorPlainProps {
  docId: string | string[] | undefined
}

const DocumentEditorPlain: FC<DocumentEditorPlainProps> = ({ docId }) => {
  const ydoc = new Y.Doc()
  const provider = new WebsocketProvider(
    'ws://localhost:1234',
    typeof docId === 'string' ? docId : 'default-room',
    ydoc
  )

  // Shared text using Yjs.
  const yText = ydoc.getText('content')

  const [content, setContent] = useState<string>(yText.toString())
  const [saveStatus, setSaveStatus] = useState<string>('')

  // Update local state when yText changes.
  useEffect(() => {
    const updateContent = () => {
      setContent(yText.toString())
    }
    yText.observe(updateContent)
    return () => {
      yText.unobserve(updateContent)
    }
  }, [yText])

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
      const initialContent = data?.content || '# Welcome\n\nStart editing...'
      if (yText.length === 0) {
        yText.insert(0, initialContent)
      }
    }
    loadDocument()
  }, [docId, yText])

  // Debounce auto-save: save 3 seconds after the last update.
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const saveDocument = async (newContent: string) => {
    if (!docId || typeof docId !== 'string') return
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
  const debouncedSave = (newContent: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveDocument(newContent)
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    // Update the shared Yjs text.
    yText.delete(0, yText.length)
    yText.insert(0, newValue)
    debouncedSave(newValue)
  }

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-fg p-6">
      <h1 className="text-3xl font-bold mb-4">Document Editor</h1>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Editor Column */}
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">Editor</h2>
          <textarea
            value={content}
            onChange={handleChange}
            className="w-full h-80 p-4 bg-[#44475a] text-obsidian-fg border border-obsidian-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {saveStatus && <p className="mt-2 text-sm">{saveStatus}</p>}
        </div>
        {/* Preview Column */}
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">Live Preview</h2>
          <div className="h-80 overflow-y-auto border border-obsidian-border bg-[#44475a] p-4 rounded">
            <MarkdownRenderer content={content} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentEditorPlain
