// pages/doc/[docId].tsx
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

// Dynamically import DocumentEditorPlain (disable SSR) without the .tsx extension.
const DocumentEditorPlain = dynamic(() => import('../../components/editors/DocumentEditorPlain'), {
  ssr: false,
});

export default function DocPage() {
  const router = useRouter();
  const { docId } = router.query;
  return <DocumentEditorPlain docId={docId} />;
}
