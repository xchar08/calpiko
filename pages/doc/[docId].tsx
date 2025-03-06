// pages/doc/[docId].tsx
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const DocumentEditorPlain = dynamic(
  () => import('../../components/editors/DocumentEditorPlain.tsx').then(mod => mod.default),
  { ssr: false }
);

export default function DocPage() {
  const router = useRouter();
  const { docId } = router.query;
  return <DocumentEditorPlain docId={docId} />;
}
