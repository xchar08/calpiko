// components/editors/DocumentEditor.tsx
import { FC, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { supabase } from '../../config/supabaseClient';
import { db, auth } from '../../config/firebaseClient';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
  Container,
  Grid,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

interface DocumentEditorProps {
  docId: string | string[] | undefined;
}

const DocumentEditor: FC<DocumentEditorProps> = ({ docId }) => {
  // Create a Yjs document and connect to WebSocket server.
  const ydoc = new Y.Doc();
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234';
  const provider = new WebsocketProvider(wsUrl, typeof docId === 'string' ? docId : 'default-room', ydoc);

  // Configure tiptap editor with collaboration extensions.
  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: auth.currentUser?.displayName || auth.currentUser?.email,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        },
      }),
    ],
    content: '',
    autoFocus: true,
  });

  // Presence tracking via Yjs awareness.
  const [currentUsers, setCurrentUsers] = useState<any[]>([]);
  useEffect(() => {
    provider.awareness.setLocalStateField('user', {
      email: auth.currentUser?.email,
      name: auth.currentUser?.displayName || auth.currentUser?.email,
    });
    const onAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values()).map((state: any) => state.user);
      setCurrentUsers(states);
    };
    provider.awareness.on('change', onAwarenessChange);
    return () => provider.awareness.off('change', onAwarenessChange);
  }, [provider.awareness]);

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
      if (yText.length === 0) {
        yText.insert(0, initialContent);
      }
    }
    loadDocument();
  }, [docId, ydoc]);

  // Auto-save debounce.
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveDocument = async () => {
    if (!editor || !docId || typeof docId !== 'string') return;
    const newContent = editor.getHTML();
    const { error } = await supabase
      .from('documents')
      .upsert({ id: docId, content: newContent }, { onConflict: 'id' });
    if (error) {
      console.error('Error saving document:', error);
      setSaveStatus('Error saving document.');
    } else {
      setSaveStatus('Document saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };
  const [saveStatus, setSaveStatus] = useState<string>('');
  const debouncedSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDocument(), 3000);
  };
  useEffect(() => {
    if (!editor) return;
    editor.on('update', debouncedSave);
    return () => {
      editor.off('update', debouncedSave);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editor]);

  // Throttled preview rendering (if needed, can add manual render button).
  const [displayContent, setDisplayContent] = useState(editor ? editor.getHTML() : '');
  const [lastRenderTime, setLastRenderTime] = useState(Date.now());
  const renderThreshold = 100; // characters
  const renderInterval = 30000; // 30 seconds
  useEffect(() => {
    if (!editor) return;
    const newContent = editor.getHTML();
    const now = Date.now();
    if (newContent.length - displayContent.length >= renderThreshold || now - lastRenderTime >= renderInterval) {
      setDisplayContent(newContent);
      setLastRenderTime(now);
    }
  }, [editor?.getHTML(), displayContent, lastRenderTime]);

  // Sharing controls via Firestore.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [accessList, setAccessList] = useState<string[]>([]);
  const loadAccessList = async () => {
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
  };
  useEffect(() => {
    loadAccessList();
  }, [docId]);

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
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">Calpiko Editor</Typography>
            <Box>
              <Button variant="contained" color="primary" onClick={() => setDisplayContent(editor ? editor.getHTML() : '')} sx={{ mr: 2 }}>
                Render Now
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
          <EditorContent editor={editor} />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5">Sharing & Presence</Typography>
            <Button variant="outlined" onClick={() => setShareDialogOpen(true)} sx={{ mr: 2, mt: 1 }}>
              Share Document
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Shared with: {accessList.join(', ')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Currently editing: {currentUsers.map((u) => u?.email).join(', ')}
            </Typography>
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

export default DocumentEditor;
