// pages/doc/[docId].tsx
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const DocumentEditor = dynamic(
  () => import('../../components/editors/DocumentEditor.tsx').then(mod => mod.default),
  { ssr: false }
);

export default function DocPage() {
  const router = useRouter();
  const { docId } = router.query;
  return <DocumentEditor docId={docId} />;
}
