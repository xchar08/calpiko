// components/DocumentEditorPlain.tsx
import React, { FC, useState, useEffect, useRef, ChangeEvent } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { supabase } from '../lib/supabaseClient';
import MarkdownRenderer from './MarkdownRenderer';
import { Container, Grid, Box, Typography, TextField } from '@mui/material';

interface DocumentEditorPlainProps {
  docId: string | string[] | undefined;
}

const DocumentEditorPlain: FC<DocumentEditorPlainProps> = ({ docId }) => {
  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider(
    'ws://localhost:1234',
    typeof docId === 'string' ? docId : 'default-room',
    ydoc
  );
  const yText = ydoc.getText('content');

  const [content, setContent] = useState<string>(yText.toString());
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    const updateContent = () => setContent(yText.toString());
    yText.observe(updateContent);
    return () => yText.unobserve(updateContent);
  }, [yText]);

  useEffect(() => {
    async function loadDocument() {
      if (!docId || typeof docId !== 'string') return;
      const { data, error } = await supabase
        .from('documents')
        .select('content')
        .eq('id', docId)
        .maybeSingle();
      if (error) console.error('Error loading document:', error);
      const initialContent = data?.content || '# Welcome\n\nStart editing...';
      if (yText.length === 0) yText.insert(0, initialContent);
    }
    loadDocument();
  }, [docId, yText]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveDocument = async (newContent: string) => {
    if (!docId || typeof docId !== 'string') return;
    const { error } = await supabase
      .from('documents')
      .upsert({ id: docId, content: newContent }, { onConflict: 'id' });
    if (error) {
      setSaveStatus('Error saving document.');
      console.error(error);
    } else {
      setSaveStatus('Document saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const debouncedSave = (newContent: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDocument(newContent), 3000);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    yText.delete(0, yText.length);
    yText.insert(0, newValue);
    debouncedSave(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#282a36', color: '#f8f8f2', minHeight: '100vh' }}>
      <Typography variant="h3" gutterBottom>
        Document Editor
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Editor
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={10}
            value={content}
            onChange={handleChange}
            variant="outlined"
            sx={{
              backgroundColor: '#44475a',
              input: { color: '#f8f8f2' },
            }}
          />
          {saveStatus && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {saveStatus}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Live Preview
          </Typography>
          <Box
            sx={{
              minHeight: 300,
              p: 2,
              backgroundColor: '#44475a',
              border: '1px solid #6272a4',
              borderRadius: 1,
              overflowY: 'auto',
            }}
          >
            <Box
              className="markdown-content"
              sx={{
                '& h1': { fontSize: '2.5rem', fontWeight: 'bold', my: 2 },
                '& h2': { fontSize: '2rem', fontWeight: 'bold', my: 2 },
                '& h3': { fontSize: '1.75rem', fontWeight: 'bold', my: 1.5 },
                '& p': { fontSize: '1rem', my: 1 },
                // Ensure markdown-specific styling remains intact
                '& *': { fontFamily: 'inherit', color: 'inherit' },
              }}
            >
              <MarkdownRenderer content={content} />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DocumentEditorPlain;
