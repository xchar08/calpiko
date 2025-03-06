// pages/doc/[docId].tsx
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

// Use explicit file extension (.tsx) in the import path.
const DocumentEditorPlain = dynamic(() => import('../../components/editors/DocumentEditorPlain.tsx'), {
  ssr: false,
});

export default function DocPage() {
  const router = useRouter();
  const { docId } = router.query;
  return <DocumentEditorPlain docId={docId} />;
}
