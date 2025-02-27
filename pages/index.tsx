import { useRouter } from 'next/router'
import { v4 as uuidv4 } from 'uuid'

const Home = () => {
  const router = useRouter()

  const createDocument = () => {
    const newDocId = uuidv4()
    router.push(`/doc/${newDocId}?token=edit123`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-obsidian-bg text-obsidian-fg">
      <h1 className="text-4xl mb-4">My Documents</h1>
      <button 
        onClick={createDocument} 
        className="px-6 py-3 bg-blue-600 text-white rounded"
      >
        Create New Document
      </button>
    </div>
  )
}

export default Home
