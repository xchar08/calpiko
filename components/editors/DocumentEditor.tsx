// components/editors/DocumentEditor.tsx
import { FC, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { supabase } from '../../config/supabaseClient';
import {
  Container,
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from '@mui/material';
import { auth, db } from '../../config/firebaseClient';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

export type Permission = 'none' | 'view' | 'edit' | 'own';

interface DocumentEditorProps {
  docId: string | string[] | undefined;
}

interface AwarenessState {
  user?: {
    email?: string;
    name?: string;
  };
}

const DocumentEditor: FC<DocumentEditorProps> = ({ docId }) => {
  // ----- State declarations -----
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [accessList, setAccessList] = useState<Record<string, Permission>>({});
  const [userPermission, setUserPermission] = useState<Permission>('none');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<Permission>('view');
  const [transferDocName, setTransferDocName] = useState('');
  const [transferConfirm, setTransferConfirm] = useState('');
  const [currentUsers, setCurrentUsers] = useState<string[]>([]);

  // ----- Yjs & WebSocket setup -----
  const ydoc = useMemo(() => new Y.Doc(), []);
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234';
  const provider = useMemo(
    () => new WebsocketProvider(wsUrl, typeof docId === 'string' ? docId : 'default-room', ydoc),
    [wsUrl, docId, ydoc]
  );
  const [userColor] = useState<string>('#' + Math.floor(Math.random() * 16777215).toString(16));

  // ----- Editor setup (Tiptap) -----
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

  // ----- Presence tracking via Yjs awareness -----
  useEffect(() => {
    provider.awareness.setLocalStateField('user', {
      email: auth.currentUser?.email,
      name: auth.currentUser?.displayName || auth.currentUser?.email,
    });
    const onAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values()) as AwarenessState[];
      const emails = states.map((s) => s.user?.email);
      const uniqueEmails = Array.from(new Set(emails)).filter((email): email is string => !!email);
      setCurrentUsers(uniqueEmails);
    };
    provider.awareness.on('change', onAwarenessChange);
    return () => provider.awareness.off('change', onAwarenessChange);
  }, [provider.awareness]);

  // ----- Load document from Supabase -----
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

  // ----- Permission management from Firestore -----
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
      if (!auth.currentUser?.email) return;
      await setDoc(doc(db, 'documentAccess', docId), { users: { [auth.currentUser.email]: 'own' } });
      setAccessList({ [auth.currentUser.email]: 'own' });
      setUserPermission('own');
    }
  }, [docId]);
  useEffect(() => {
    loadAccessList();
  }, [docId, loadAccessList]);

  // ----- Determine render & edit permissions -----
  const canRenderEditor = userPermission !== 'none';
  const isEditable = userPermission === 'edit' || userPermission === 'own';

  // ----- Auto-save via editor onUpdate -----
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
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      const newContent = editor.getHTML();
      debouncedSave(newContent);
    };
    editor.on('update', onUpdate);
    return () => editor.off('update', onUpdate);
  }, [editor, debouncedSave]);

  // ----- Sharing controls -----
  const handleShare = async () => {
    if (!docId || typeof docId !== 'string' || !shareEmail) return;
    const docRef = doc(db, 'documentAccess', docId);
    if (sharePermission === 'own') {
      if (transferDocName.trim() === '' || transferConfirm.toLowerCase() !== 'yes') {
        alert('Please enter the document name and type "yes" to confirm ownership transfer.');
        return;
      }
      await updateDoc(docRef, {
        [`users.${shareEmail}`]: 'own',
        [`users.${auth.currentUser?.email}`]: 'edit',
      });
    } else {
      await updateDoc(docRef, { [`users.${shareEmail}`]: sharePermission });
    }
    setShareDialogOpen(false);
    setShareEmail('');
    setSharePermission('view');
    setTransferDocName('');
    setTransferConfirm('');
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
      
      {/* Combined Editor & Live Preview (Tiptap handles rendering live) */}
      <Box sx={{ border: '1px solid #6272a4', borderRadius: 1, overflow: 'hidden' }}>
        <EditorContent editor={editor} />
      </Box>
      {saveStatus && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {saveStatus}
        </Typography>
      )}
      
      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Share Document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="User Email"
              fullWidth
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel id="share-permission-label">Permission</InputLabel>
              <Select
                labelId="share-permission-label"
                value={sharePermission}
                label="Permission"
                onChange={(e) => setSharePermission(e.target.value as Permission)}
              >
                <MenuItem value="view">View</MenuItem>
                <MenuItem value="edit">Edit</MenuItem>
                <MenuItem value="own">Transfer Ownership</MenuItem>
              </Select>
            </FormControl>
            {sharePermission === 'own' && (
              <>
                <TextField
                  label="Enter Document Name to Confirm Transfer"
                  fullWidth
                  value={transferDocName}
                  onChange={(e) => setTransferDocName(e.target.value)}
                />
                <TextField
                  label='Type "yes" to confirm'
                  fullWidth
                  value={transferConfirm}
                  onChange={(e) => setTransferConfirm(e.target.value)}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleShare}>Share</Button>
        </DialogActions>
      </Dialog>
      
      {/* Owner Permission Management */}
      {userPermission === 'own' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Manage Permissions</Typography>
          {Object.entries(accessList).map(([email, perm]) =>
            email !== auth.currentUser?.email ? (
              <Box key={email} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  {email}:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
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
