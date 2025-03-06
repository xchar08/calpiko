// components/editors/DocumentEditor.tsx
import { FC, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { supabase } from '../../config/supabaseClient';
import { Container, Box, Typography, Button, Grid } from '@mui/material';
import { auth } from '../../config/firebaseClient';

interface DocumentEditorProps {
  docId: string | string[] | undefined;
}

const DocumentEditor: FC<DocumentEditorProps> = ({ docId }) => {
  // Memoize the Yjs document so it's not recreated on every render.
  const ydoc = useMemo(() => new Y.Doc(), []);
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234';
  const provider = useMemo(
    () => new WebsocketProvider(wsUrl, typeof docId === 'string' ? docId : 'default-room', ydoc),
    [wsUrl, docId, ydoc]
  );

  const [userColor] = useState<string>(
    '#' + Math.floor(Math.random() * 16777215).toString(16)
  );
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: auth.currentUser?.displayName || auth.currentUser?.email,
          color: userColor,
        },
      }),
    ],
    content: '',
    autofocus: true, // Note: using lowercase "autofocus"
  });

  // Load document content from Supabase.
  useEffect(() => {
    async function loadDocument() {
      if (!docId || typeof docId !== 'string') return;
      const { data, error } = await supabase
        .from('documents')
        .select('content')
        .eq('id', docId)
        .maybeSingle();
      if (error) console.error('Error loading document:', error);
      const initialContent = data?.content || '## Welcome to your Document!\n\nStart editing...';
      const yText = ydoc.getText('prosemirror');
      if (yText.length === 0) yText.insert(0, initialContent);
    }
    loadDocument();
  }, [docId, ydoc]);

  useEffect(() => {
    if (editor) {
      editor.commands.focus();
    }
  }, [editor]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveDocument = useCallback(async () => {
    if (!editor || !docId || typeof docId !== 'string') return;
    const newContent = editor.getHTML();
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
  }, [editor, docId]);

  const debouncedSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDocument(), 3000);
  }, [saveDocument]);

  useEffect(() => {
    if (!editor) return;
    editor.on('update', debouncedSave);
    return () => {
      editor.off('update', debouncedSave);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editor, debouncedSave]);

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#282a36', color: '#f8f8f2', minHeight: '100vh' }}>
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">Calpiko Editor</Typography>
            <Box>
              <Button variant="contained" color="primary" onClick={() => setShowPreview(!showPreview)} sx={{ mr: 2 }}>
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button variant="contained" color="success" onClick={saveDocument}>
                Save Now
              </Button>
            </Box>
          </Box>
          {saveStatus && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {saveStatus}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ border: '1px solid #6272a4', backgroundColor: '#44475a', p: 2, borderRadius: 1, minHeight: 400 }}>
            <EditorContent editor={editor} />
          </Box>
        </Grid>
        {showPreview && (
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>Preview</Typography>
            <Box sx={{ border: '1px solid #6272a4', backgroundColor: '#44475a', p: 2, borderRadius: 1 }}>
              <div dangerouslySetInnerHTML={{ __html: editor ? editor.getHTML() : '' }} />
            </Box>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default DocumentEditor;
