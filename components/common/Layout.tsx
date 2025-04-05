// components/common/Layout.tsx
import { FC, ReactNode } from 'react';
import { Box, Container, Typography, Button, AppBar, Toolbar, Avatar, Menu, MenuItem, IconButton, Divider } from '@mui/material';
import { auth } from '../../config/firebaseClient';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout: FC<LayoutProps> = ({ children, title = 'Calpiko' }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    signOut(auth);
    handleClose();
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      backgroundColor: '#282a36'
    }}>
      <AppBar position="static" sx={{ backgroundColor: '#44475a', boxShadow: 2 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Link href="/" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h4" sx={{ 
              color: '#8be9fd', 
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              cursor: 'pointer'
            }}>
              {title}
            </Typography>
          </Link>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2, color: '#f8f8f2' }}>
              {auth.currentUser?.email}
            </Typography>
            <IconButton
              onClick={handleMenu}
              size="small"
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: '#bd93f9',
                  fontSize: '0.875rem'
                }}
              >
                {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>
          
          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'button',
            }}
            PaperProps={{
              sx: {
                backgroundColor: '#44475a',
                color: '#f8f8f2',
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleClose} sx={{ '&:hover': { backgroundColor: '#6272a4' } }}>
              <Link href="/live-preview" passHref style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
                Preview Editor
              </Link>
            </MenuItem>
            <Divider sx={{ borderColor: '#6272a4' }} />
            <MenuItem onClick={handleLogout} sx={{ '&:hover': { backgroundColor: '#6272a4' } }}>
              Log Out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ 
        py: 4, 
        px: { xs: 2, sm: 4 },
        flex: 1,
        color: '#f8f8f2',
      }}>
        {children}
      </Container>
      
      <Box component="footer" sx={{ 
        py: 2, 
        textAlign: 'center', 
        borderTop: '1px solid #6272a4',
        backgroundColor: '#282a36',
        color: '#6272a4'
      }}>
        <Typography variant="body2">
          Calpiko © {new Date().getFullYear()} | Collaborative Research Editor
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;