import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

const DocumentEditor = dynamic(() => import('../../components/DocumentEditor'), {
  ssr: false,
})

const DocPage = () => {
  const router = useRouter()
  const { docId } = router.query

  return (
    <div>
      <DocumentEditor docId={docId} />
    </div>
  )
}

export default DocPage
