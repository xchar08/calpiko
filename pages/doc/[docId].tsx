import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

// Dynamically import the collaborative plain-text editor (to disable SSR).
const DocumentEditorPlain = dynamic(() => import('../../components/DocumentEditorPlain'), {
  ssr: false,
})

export default function DocPage() {
  const router = useRouter()
  const { docId } = router.query

  return <DocumentEditorPlain docId={docId} />
}
