// components/common/Layout.tsx
import { FC, ReactNode } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { auth } from '../../config/firebaseClient';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#282a36', color: '#f8f8f2' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #6272a4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h3">Calpiko</Typography>
        <Box>
          <Typography variant="body2">
            Logged in as: {auth.currentUser?.email}
          </Typography>
          <Button variant="text" onClick={() => signOut(auth)}>Log Out</Button>
        </Box>
      </Box>
      <Container sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
