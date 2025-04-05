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
  Paper,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import Layout from '../common/Layout';
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
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [accessList, setAccessList] = useState<Record<string, Permission>>({});
  const [userPermission, setUserPermission] = useState<Permission>('none');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<Permission>('view');
  const [transferDocName, setTransferDocName] = useState('');
  const [transferConfirm, setTransferConfirm] = useState('');
  const [currentUsers, setCurrentUsers] = useState<string[]>([]);
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');

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

  // Set editor editable state based on permission ("view" makes it read-only)
  useEffect(() => {
    if (editor) {
      editor.setEditable(userPermission !== 'view');
    }
  }, [editor, userPermission]);

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

  // ----- Load document content from Supabase -----
  useEffect(() => {
    async function loadDocument() {
      if (!docId || typeof docId !== 'string') return;
      const { data, error } = await supabase
        .from('documents')
        .select('content, title')
        .eq('id', docId)
        .maybeSingle();
      if (error) console.error('Error loading document:', error);
      const initialContent = data?.content || '## Welcome to your Document!\n\nStart editing...';
      if (data?.title) setDocumentTitle(data.title);
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

  // ----- Auto-save debounce -----
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveDocument = useCallback(async (newContent: string) => {
    if (!docId || typeof docId !== 'string') return;
    const { error } = await supabase
      .from('documents')
      .upsert({ id: docId, content: newContent, title: documentTitle }, { onConflict: 'id' });
    if (error) {
      setSaveStatus('Error saving document.');
      console.error(error);
    } else {
      setSaveStatus('Document saved!');
      setSnackbarOpen(true);
      setTimeout(() => setSnackbarOpen(false), 2000);
    }
  }, [docId, documentTitle]);
  
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
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, debouncedSave]);

  // ----- Save title -----
  const saveTitle = async () => {
    if (!docId || typeof docId !== 'string') return;
    const { error } = await supabase
      .from('documents')
      .update({ title: documentTitle })
      .eq('id', docId);
    
    if (error) {
      console.error('Error saving title:', error);
    } else {
      setSnackbarOpen(true);
    }
  };

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

  // ----- Get permission badge color -----
  const getPermissionColor = (perm: Permission) => {
    switch (perm) {
      case 'own': return 'error';
      case 'edit': return 'success';
      case 'view': return 'info';
      default: return 'default';
    }
  };

  // ----- Render -----
  return (
    <Layout>
      {!canRenderEditor ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#44475a' }}>
          <Typography variant="h4" color="error">
            You do not have permission to view this document.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ mb: 4 }}>
          {/* Document Header */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <TextField 
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                onBlur={saveTitle}
                variant="outlined"
                size="small"
                sx={{ 
                  maxWidth: '500px',
                  backgroundColor: '#44475a',
                  input: { color: '#f8f8f2', fontWeight: 'bold', fontSize: '1.2rem' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#6272a4' },
                    '&:hover fieldset': { borderColor: '#8be9fd' },
                    '&.Mui-focused fieldset': { borderColor: '#ff79c6' },
                  }
                }}
              />
              {userPermission === 'view' && (
                <Chip label="Read Only" color="info" size="small" />
              )}
            </Box>
            
            <Box>
              <Tooltip title="Share Document">
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => setShareDialogOpen(true)}
                  startIcon={<PersonAddIcon />}
                  sx={{ mr: 1 }}
                >
                  Share
                </Button>
              </Tooltip>
              <Tooltip title="Save Document">
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => editor && saveDocument(editor.getHTML())}
                  startIcon={<SaveIcon />}
                >
                  Save
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* Collaborator & Users Info */}
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#44475a', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#8be9fd' }}>
                  Currently Active:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {currentUsers.map(email => (
                    <Chip 
                      key={email}
                      label={email}
                      size="small"
                      icon={<PersonIcon />}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                  {currentUsers.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No active users</Typography>
                  )}
                </Box>
              </Box>
              
              <Divider orientation="vertical" flexItem sx={{ backgroundColor: '#6272a4' }} />
              
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#8be9fd' }}>
                  Access List:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(accessList).map(([email, perm]) => (
                    <Chip
                      key={email}
                      label={`${email.split('@')[0]}`}
                      size="small"
                      color={getPermissionColor(perm)}
                      sx={{ '& .MuiChip-label': { maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' } }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Editor */}
          <Paper 
            elevation={3}
            sx={{ 
              borderRadius: 2, 
              overflow: 'hidden',
              backgroundColor: '#44475a',
              border: '1px solid #6272a4',
              mb: 3,
              '.ProseMirror': {
                minHeight: '500px',
                padding: '16px',
                outline: 'none',
                '&:focus': {
                  boxShadow: 'inset 0 0 0 2px rgba(139, 233, 253, 0.3)',
                },
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  color: '#ff79c6',
                  marginBottom: '0.5em',
                },
                '& p': {
                  marginBottom: '1em',
                },
                '& ul, & ol': {
                  padding: '0 1rem',
                },
                '& code': {
                  backgroundColor: '#282a36',
                  padding: '0.2em 0.4em',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                },
                '& blockquote': {
                  borderLeft: '3px solid #6272a4',
                  paddingLeft: '1rem',
                  color: '#f1fa8c',
                }
              }
            }}
          >
            <EditorContent editor={editor} />
          </Paper>

          {/* Owner Permission Management */}
          {userPermission === 'own' && (
            <Paper sx={{ p: 3, backgroundColor: '#44475a', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#ff79c6' }}>Manage Permissions</Typography>
              <Divider sx={{ mb: 2, backgroundColor: '#6272a4' }} />
              
              {Object.entries(accessList).map(([email, perm]) =>
                email !== auth.currentUser?.email ? (
                  <Box 
                    key={email} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: 'rgba(98, 114, 164, 0.2)',
                    }}
                  >
                    <Typography variant="body2" sx={{ minWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {email}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 120, mr: 1 }}>
                        <Select
                          value={perm}
                          onChange={(e) => handlePermissionChange(email, e.target.value as Permission)}
                          sx={{ 
                            backgroundColor: '#282a36',
                            color: '#f8f8f2',
                            '.MuiOutlinedInput-notchedOutline': { borderColor: '#6272a4' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8be9fd' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff79c6' },
                          }}
                        >
                          <MenuItem value="view">View</MenuItem>
                          <MenuItem value="edit">Edit</MenuItem>
                          <MenuItem value="own">Owner</MenuItem>
                          <MenuItem value="none">No Access</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => removeAccess(email)}
                        sx={{ color: '#ff5555' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ) : null
              )}
            </Paper>
          )}

          {/* Share Dialog */}
          <Dialog 
            open={shareDialogOpen} 
            onClose={() => setShareDialogOpen(false)} 
            fullWidth 
            maxWidth="sm"
            PaperProps={{
              sx: {
                backgroundColor: '#282a36',
                color: '#f8f8f2',
                border: '1px solid #6272a4',
              }
            }}
          >
            <DialogTitle sx={{ borderBottom: '1px solid #6272a4', color: '#ff79c6' }}>
              Share Document
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} mt={2}>
                <TextField
                  label="User Email"
                  fullWidth
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  sx={{
                    input: { color: '#f8f8f2' },
                    label: { color: '#bd93f9' },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#6272a4' },
                      '&:hover fieldset': { borderColor: '#8be9fd' },
                      '&.Mui-focused fieldset': { borderColor: '#ff79c6' },
                    }
                  }}
                />
                <FormControl fullWidth>
                  <InputLabel id="share-permission-label" sx={{ color: '#bd93f9' }}>
                    Permission
                  </InputLabel>
                  <Select
                    labelId="share-permission-label"
                    value={sharePermission}
                    label="Permission"
                    onChange={(e) => setSharePermission(e.target.value as Permission)}
                    sx={{
                      color: '#f8f8f2',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: '#6272a4' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8be9fd' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff79c6' },
                    }}
                  >
                    <MenuItem value="view">View</MenuItem>
                    <MenuItem value="edit">Edit</MenuItem>
                    <MenuItem value="own">Transfer Ownership</MenuItem>
                  </Select>
                </FormControl>
                
                {sharePermission === 'own' && (
                  <>
                    <Alert severity="warning" sx={{ backgroundColor: '#44475a', color: '#f1fa8c' }}>
                      Transferring ownership will reduce your access to "Edit" permissions.
                    </Alert>
                    <TextField
                      label="Enter Document Name to Confirm Transfer"
                      fullWidth
                      value={transferDocName}
                      onChange={(e) => setTransferDocName(e.target.value)}
                      sx={{
                        input: { color: '#f8f8f2' },
                        label: { color: '#bd93f9' },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#6272a4' },
                          '&:hover fieldset': { borderColor: '#8be9fd' },
                          '&.Mui-focused fieldset': { borderColor: '#ff79c6' },
                        }
                      }}
                    />
                    <TextField
                      label='Type "yes" to confirm'
                      fullWidth
                      value={transferConfirm}
                      onChange={(e) => setTransferConfirm(e.target.value)}
                      sx={{
                        input: { color: '#f8f8f2' },
                        label: { color: '#bd93f9' },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#6272a4' },
                          '&:hover fieldset': { borderColor: '#8be9fd' },
                          '&.Mui-focused fieldset': { borderColor: '#ff79c6' },
                        }
                      }}
                    />
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ borderTop: '1px solid #6272a4', padding: 2 }}>
              <Button onClick={() => setShareDialogOpen(false)} sx={{ color: '#8be9fd' }}>
                Cancel
              </Button>
              <Button 
                onClick={handleShare} 
                variant="contained" 
                sx={{ backgroundColor: '#bd93f9', '&:hover': { backgroundColor: '#ff79c6' } }}
              >
                Share
              </Button>
            </DialogActions>
          </Dialog>

          {/* Save Status Snackbar */}
          <Snackbar 
            open={snackbarOpen} 
            autoHideDuration={2000} 
            onClose={() => setSnackbarOpen(false)}
          >
            <Alert 
              severity="success" 
              sx={{ 
                backgroundColor: '#50fa7b', 
                color: '#282a36',
                width: '100%' 
              }}
            >
              {saveStatus || 'Document saved successfully!'}
            </Alert>
          </Snackbar>
        </Box>
      )}
    </Layout>
  );
};

export default DocumentEditor;