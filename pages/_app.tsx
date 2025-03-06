// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { auth } from '../config/firebaseClient';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Container, Typography, Button } from '@mui/material';

function MyApp({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!user) {
    const provider = new GoogleAuthProvider();
    return (
      <Container sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Please log in to access your documents
        </Typography>
        <Button variant="contained" onClick={() => signInWithPopup(auth, provider)}>
          Log in with Google
        </Button>
      </Container>
    );
  }

  return <Component {...pageProps} />;
}

export default MyApp;
