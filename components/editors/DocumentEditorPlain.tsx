// components/editors/DocumentEditorPlain.tsx
import { FC, useState, useEffect, useRef, ChangeEvent, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { supabase } from '../../config/supabaseClient';
import MarkdownRenderer from '../markdown/MarkdownRenderer';
import { db, auth } from '../../config/firebaseClient';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
  Container,
  Grid,
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

interface DocumentEditorPlainProps {
  docId: string | string[] | undefined;
}

// Define a type for Yjs awareness state
interface AwarenessState {
  user?: {
    email?: string;
    name?: string;
  };
}

const DocumentEditorPlain: FC<DocumentEditorPlainProps> = ({ docId }) => {
  const ydoc = new Y.Doc();
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234';
  const provider = new WebsocketProvider(wsUrl, typeof docId === 'string' ? docId : 'default-room', ydoc);
  const yText = ydoc.getText('content');

  // Presence tracking using Yjs awareness.
  const [currentUsers, setCurrentUsers] = useState<string[]>([]);
  useEffect(() => {
    provider.awareness.setLocalStateField('user', {
      email: auth.currentUser?.email,
      name: auth.currentUser?.displayName || auth.currentUser?.email,
    });
    const onAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values()) as AwarenessState[];
      const uniqueEmails = Array.from(new Set(states.map(s => s.user?.email))).filter((email): email is string => !!email);
      setCurrentUsers(uniqueEmails);
    };
    provider.awareness.on('change', onAwarenessChange);
    return () => provider.awareness.off('change', onAwarenessChange);
  }, [provider.awareness]);

  const [content, setContent] = useState<string>(yText.toString());
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Throttled markdown rendering.
  const [displayContent, setDisplayContent] = useState(content);
  const [lastRenderTime, setLastRenderTime] = useState(Date.now());
  const renderThreshold = 100;
  const renderInterval = 30000;

  useEffect(() => {
    const now = Date.now();
    if (content.length - displayContent.length >= renderThreshold || now - lastRenderTime >= renderInterval) {
      setDisplayContent(content);
      setLastRenderTime(now);
    }
  }, [content, displayContent.length, lastRenderTime]);

  useEffect(() => {
    const updateContent = () => setContent(yText.toString());
    yText.observe(updateContent);
    return () => yText.unobserve(updateContent);
  }, [yText]);

  // Load document from Supabase.
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

  // Auto-save debounce.
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveDocument = useCallback(async (newContent: string) => {
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
  }, [docId]);
  
  const debouncedSave = useCallback((newContent: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDocument(newContent), 3000);
  }, [saveDocument]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    yText.delete(0, yText.length);
    yText.insert(0, newValue);
    debouncedSave(newValue);
  };

  // Access control via Firestore.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [accessList, setAccessList] = useState<string[]>([]);
  const loadAccessList = useCallback(async () => {
    if (!docId || typeof docId !== 'string') return;
    const docRef = doc(db, 'documentAccess', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setAccessList(data.users || []);
    } else {
      await setDoc(doc(db, 'documentAccess', docId), { users: [auth.currentUser?.email] });
      setAccessList([auth.currentUser?.email || '']);
    }
  }, [docId]);
  
  useEffect(() => {
    loadAccessList();
  }, [docId, loadAccessList]);

  const handleShare = async () => {
    if (!docId || typeof docId !== 'string' || !shareEmail) return;
    const docRef = doc(db, 'documentAccess', docId);
    await updateDoc(docRef, { users: arrayUnion(shareEmail) });
    setShareDialogOpen(false);
    setShareEmail('');
    loadAccessList();
  };

  const removeAccess = async (email: string) => {
    if (!docId || typeof docId !== 'string') return;
    const docRef = doc(db, 'documentAccess', docId);
    await updateDoc(docRef, { users: arrayRemove(email) });
    loadAccessList();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#282a36', color: '#f8f8f2', minHeight: '100vh' }}>
      <Typography variant="h3" gutterBottom>Document Editor</Typography>
      {/* Share & Presence Bar */}
      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={() => setShareDialogOpen(true)} sx={{ mr: 2 }}>
          Share Document
        </Button>
        <Typography variant="body2" sx={{ display: 'inline-block', mr: 2 }}>
          Shared with: {accessList.join(', ')}
        </Typography>
        <Typography variant="body2" sx={{ display: 'inline-block' }}>
          Currently editing: {currentUsers.join(', ')}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>Editor</Typography>
          <textarea
            value={content}
            onChange={handleChange}
            style={{
              width: '100%',
              height: '20rem',
              padding: '1rem',
              backgroundColor: '#44475a',
              color: '#f8f8f2',
              border: '1px solid #6272a4',
              borderRadius: '4px',
              outline: 'none',
            }}
          />
          {saveStatus && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {saveStatus}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>Live Preview</Typography>
          <Box
            sx={{
              height: '20rem',
              overflowY: 'auto',
              border: '1px solid #6272a4',
              backgroundColor: '#44475a',
              padding: 2,
              borderRadius: 1,
            }}
          >
            <Box
              className="markdown-content"
              sx={{
                '& h1': { fontSize: '2.5rem', fontWeight: 'bold', my: 2 },
                '& h2': { fontSize: '2rem', fontWeight: 'bold', my: 2 },
                '& h3': { fontSize: '1.75rem', fontWeight: 'bold', my: 1.5 },
                '& p': { fontSize: '1rem', my: 1 },
                '& *': { fontFamily: 'inherit', color: 'inherit' },
              }}
            >
              <MarkdownRenderer content={displayContent} />
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => setDisplayContent(content)}>
              Render Now
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Document</DialogTitle>
        <DialogContent>
          <TextField
            label="User Email"
            fullWidth
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleShare}>Share</Button>
        </DialogActions>
      </Dialog>

      {/* Access List */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Access List</Typography>
        <List>
          {accessList.map((email) => (
            <ListItem
              key={email}
              secondaryAction={
                email !== auth.currentUser?.email && (
                  <Button variant="text" color="error" onClick={() => removeAccess(email)}>
                    Remove
                  </Button>
                )
              }
            >
              <ListItemText primary={email} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Container>
  );
};

export default DocumentEditorPlain;
