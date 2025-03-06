// components/editors/DocumentEditor.tsx
import { FC, useState, useEffect, useRef, useMemo, useCallback, ChangeEvent } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { supabase } from '../../config/supabaseClient';
import { Container, Box, Typography, Button, Grid, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { auth, db } from '../../config/firebaseClient';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import MarkdownRenderer from '../../components/markdown/MarkdownRenderer';

export type Permission = 'none' | 'view' | 'edit' | 'own';

interface DocumentEditorProps {
  docId: string | string[] | undefined;
}

const DocumentEditor: FC<DocumentEditorProps> = ({ docId }) => {
  // Create a Yjs document once.
  const ydoc = useMemo(() => new Y.Doc(), []);
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234';
  const provider = useMemo(
    () => new WebsocketProvider(wsUrl, typeof docId === 'string' ? docId : 'default-room', ydoc),
    [wsUrl, docId, ydoc]
  );
  const [userColor] = useState<string>('#' + Math.floor(Math.random() * 16777215).toString(16));
  
  // Save status is defined only once.
  const [saveStatus, setSaveStatus] = useState<string>('');
  
  // Permission and access management.
  const [accessList, setAccessList] = useState<Record<string, Permission>>({});
  const [userPermission, setUserPermission] = useState<Permission>('none');
  
  // Initialize the Tiptap editor with collaboration.
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
    autofocus: true,
  });

  // Presence tracking via Yjs awareness.
  const [currentUsers, setCurrentUsers] = useState<string[]>([]);
  useEffect(() => {
    provider.awareness.setLocalStateField('user', {
      email: auth.currentUser?.email,
      name: auth.currentUser?.displayName || auth.currentUser?.email,
    });
    const onAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const emails = states.map((s: any) => s.user?.email);
      const uniqueEmails = Array.from(new Set(emails)).filter((email): email is string => !!email);
      setCurrentUsers(uniqueEmails);
    };
    provider.awareness.on('change', onAwarenessChange);
    return () => provider.awareness.off('change', onAwarenessChange);
  }, [provider.awareness]);

  // Live content state from the Yjs document.
  const [content, setContent] = useState<string>(ydoc.getText('prosemirror').toString());
  useEffect(() => {
    const updateContent = () => setContent(ydoc.getText('prosemirror').toString());
    ydoc.getText('prosemirror').observe(updateContent);
    return () => ydoc.getText('prosemirror').unobserve(updateContent);
  }, [ydoc]);

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

  // Permission management: load permissions from Firestore.
  const loadAccessList = useCallback(async () => {
    if (!docId || typeof docId !== 'string') return;
    const docRef = doc(db, 'documentAccess', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const users = data.users as Record<string, Permission> | undefined;
      if (users) {
        setAccessList(users);
        const perm = users[auth.currentUser?.email || ''] || 'none';
        setUserPermission(perm);
      }
    } else {
      await setDoc(doc(db, 'documentAccess', docId), { users: { [auth.currentUser?.email!]: 'own' } });
      setAccessList({ [auth.currentUser?.email!]: 'own' });
      setUserPermission('own');
    }
  }, [docId]);
  useEffect(() => {
    loadAccessList();
  }, [docId, loadAccessList]);

  // Determine if we can render the editor.
  const canRenderEditor = userPermission !== 'none';
  // Determine if the editor should be editable.
  const isEditable = userPermission === 'edit' || userPermission === 'own';

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

  // Handle editor changes (if using a textarea fallback, you can modify this as needed).
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const yText = ydoc.getText('prosemirror');
    yText.delete(0, yText.length);
    yText.insert(0, newValue);
    debouncedSave(newValue);
  }, [ydoc, debouncedSave]);

  // Sharing controls.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const handleShare = async () => {
    if (!docId || typeof docId !== 'string' || !shareEmail) return;
    const docRef = doc(db, 'documentAccess', docId);
    // When sharing, default permission is "view".
    await updateDoc(docRef, { [`users.${shareEmail}`]: 'view' });
    setShareDialogOpen(false);
    setShareEmail('');
    loadAccessList();
  };
  const handlePermissionChange = async (email: string, newPermission: Permission) => {
    if (!docId || typeof docId !== 'string') return;
    const docRef = doc(db, 'documentAccess', docId);
    await updateDoc(docRef, { [`users.${email}`]: newPermission });
    loadAccessList();
  };
  const removeAccess = async (email: string) => {
    if (!docId || typeof docId !== 'string') return;
    const docRef = doc(db, 'documentAccess', docId);
    await updateDoc(docRef, { [`users.${email}`]: deleteField() });
    loadAccessList();
  };

  if (!canRenderEditor) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" color="error">
          You do not have permission to view this document.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#282a36', color: '#f8f8f2', minHeight: '100vh' }}>
      <Typography variant="h3" gutterBottom>Document Editor</Typography>
      {/* Share & Presence Bar */}
      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={() => setShareDialogOpen(true)} sx={{ mr: 2 }}>
          Share Document
        </Button>
        <Box>
          <Typography variant="body2">
            Shared with:{" "}
            {Object.entries(accessList)
              .map(([email, perm]) => `${email} (${perm})`)
              .join(', ')}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Currently editing: {currentUsers.join(', ')}
          </Typography>
        </Box>
      </Box>

      {/* Combined Editor & Live Preview */}
      <Box sx={{ border: '1px solid #6272a4', borderRadius: 1, overflow: 'hidden' }}>
        <EditorContent editor={editor} />
      </Box>
      {saveStatus && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {saveStatus}
        </Typography>
      )}

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

      {/* If owner, allow changing permissions for each shared user */}
      {userPermission === 'own' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Manage Permissions</Typography>
          {Object.entries(accessList).map(([email, perm]) =>
            email !== auth.currentUser?.email ? (
              <Box key={email} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  {email}:
                </Typography>
                <FormControl size="small">
                  <InputLabel id={`perm-label-${email}`}>Permission</InputLabel>
                  <Select
                    labelId={`perm-label-${email}`}
                    value={perm}
                    label="Permission"
                    onChange={(e) => handlePermissionChange(email, e.target.value as Permission)}
                  >
                    <MenuItem value="view">View</MenuItem>
                    <MenuItem value="edit">Edit</MenuItem>
                    <MenuItem value="own">Own</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="text" color="error" onClick={() => removeAccess(email)} sx={{ ml: 1 }}>
                  Remove
                </Button>
              </Box>
            ) : null
          )}
        </Box>
      )}
    </Container>
  );
};

export default DocumentEditor;
