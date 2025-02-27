import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/router'
import Link from 'next/link'

interface DocumentRow {
  id: string
  title?: string
}

export default function Home() {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from<DocumentRow>('documents')
        .select('id, title')
      if (error) {
        console.error('Error fetching documents:', error)
      } else {
        setDocuments(data || [])
      }
      setLoading(false)
    }
    fetchDocuments()
  }, [])

  const createDocument = () => {
    const newDocId = uuidv4()
    router.push(`/doc/${newDocId}?token=edit123`)
  }

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-fg p-6">
      <div className="bg-blue-600 p-4 text-white">
        This div should have a blue background.
      </div>
      <h1 className="text-4xl mb-6 font-bold">Calpiko Dashboard</h1>
      <button
        onClick={createDocument}
        className="px-6 py-3 bg-blue-600 text-white rounded shadow mb-8"
      >
        Create New Document
      </button>
      {loading ? (
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents found.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="border border-obsidian-border p-3 rounded">
              <Link href={`/doc/${doc.id}?token=edit123`} className="hover:underline">
                {doc.title || doc.id}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
