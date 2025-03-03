// pages/index.tsx
import { Button, Container, Typography, Box } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

interface DocumentRow {
  id: string;
  title?: string;
}

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDocuments() {
      const { data, error } = await supabase
        .from<DocumentRow>('documents')
        .select('id, title');
      if (error) {
        console.error('Error fetching documents:', error);
      } else {
        setDocuments(data || []);
      }
      setLoading(false);
    }
    fetchDocuments();
  }, []);

  const createDocument = () => {
    const newDocId = uuidv4();
    router.push(`/doc/${newDocId}?token=edit123`);
  };

  return (
    <Container maxWidth="md" sx={{ pt: 4 }}>
      <Box sx={{ backgroundColor: 'primary.main', p: 2, mb: 3, borderRadius: 1 }}>
        <Typography variant="h4" color="white">
          Calpiko Dashboard
        </Typography>
      </Box>
      <Button variant="contained" color="primary" onClick={createDocument} sx={{ mb: 3 }}>
        Create New Document
      </Button>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : documents.length === 0 ? (
        <Typography>No documents found.</Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', pl: 0 }}>
          {documents.map((doc) => (
            <Box
              component="li"
              key={doc.id}
              sx={{
                border: 1,
                borderColor: 'primary.main',
                p: 2,
                borderRadius: 1,
                mb: 1,
              }}
            >
              <a
                href={`/doc/${doc.id}?token=edit123`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Typography>{doc.title || doc.id}</Typography>
              </a>
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
}
