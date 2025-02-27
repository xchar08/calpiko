import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseServerClient'

interface DocumentData {
  id: string
  content: string
  title?: string
  updated_at?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DocumentData | { error: string }>
) {
  const { query: { docId }, method } = req

  if (!docId || typeof docId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid document ID' })
  }

  switch (method) {
    case 'GET': {
      const { data, error } = await supabaseAdmin
        .from<DocumentData>('documents')
        .select('*')
        .eq('id', docId)
        .single()

      if (error) {
        return res.status(404).json({ error: error.message })
      }
      return res.status(200).json(data)
    }
    case 'POST': {
      const { content, title } = req.body
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'Missing document content' })
      }
      const { data, error } = await supabaseAdmin
        .from<DocumentData>('documents')
        .insert([{ id: docId, content, title }])
        .single()
      if (error) {
        return res.status(500).json({ error: error.message })
      }
      return res.status(201).json(data)
    }
    case 'PUT': {
      const { content, title } = req.body
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'Missing document content' })
      }
      const { data, error } = await supabaseAdmin
        .from<DocumentData>('documents')
        .update({ content, title, updated_at: new Date().toISOString() })
        .eq('id', docId)
        .single()
      if (error) {
        return res.status(500).json({ error: error.message })
      }
      return res.status(200).json(data)
    }
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT'])
      return res.status(405).json({ error: `Method ${method} Not Allowed` })
  }
}
