// pages/index.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Container, Button, Typography, Box, List, ListItem, ListItemText } from '@mui/material';

interface DocumentRow {
  id: string;
  title?: string;
}

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data, error } = await supabase
      .from('documents')
      .select('id, title');
      if (error) console.error('Error fetching documents:', error);
      else setDocuments(data || []);
      setLoading(false);
    };
    fetchDocuments();
  }, []);

  const createDocument = () => {
    const newDocId = uuidv4();
    router.push(`/doc/${newDocId}?token=edit123`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#282a36', color: '#f8f8f2', minHeight: '100vh' }}>
      <Box sx={{ backgroundColor: 'blue', p: 2, color: 'white', mb: 3 }}>
        <Typography variant="h5">Calpiko Dashboard</Typography>
      </Box>
      <Typography variant="h3" gutterBottom>Dashboard</Typography>
      <Button variant="contained" onClick={createDocument} sx={{ mb: 3 }}>
        Create New Document
      </Button>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : documents.length === 0 ? (
        <Typography>No documents found.</Typography>
      ) : (
        <List>
          {documents.map((doc) => (
            <ListItem key={doc.id} sx={{ border: '1px solid #6272a4', mb: 1, borderRadius: 1 }}>
              <ListItemText>
                <Link href={`/doc/${doc.id}?token=edit123`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {doc.title || doc.id}
                </Link>
              </ListItemText>
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
}
