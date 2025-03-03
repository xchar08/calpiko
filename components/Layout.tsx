// components/Layout.tsx
import React, { FC, ReactNode } from 'react';
import { Box, Container, Typography } from '@mui/material';

interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#282a36', color: '#f8f8f2' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #6272a4' }}>
        <Typography variant="h3">Calpiko</Typography>
      </Box>
      <Container sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
