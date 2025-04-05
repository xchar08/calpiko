// pages/live-preview.tsx
import { useState, useEffect, useRef } from 'react';
import { Container, Box, Typography, TextField, Button, Paper } from '@mui/material';
import MarkdownRenderer from '../components/markdown/MarkdownRenderer';
import Layout from '../components/common/Layout';

export default function LivePreview() {
  const [rawMarkdown, setRawMarkdown] = useState(`# Mathematics Example

This is inline math: $E = mc^2$

Here is a block equation:

$$
\\int_0^\\infty e^{-x} dx = 1
$$

## Chemistry Example

Water: $H_2O$

Benzene formula:

$$
C_6H_6
$$

## Physics Example

The Schrödinger equation:

$$
i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat H\\Psi(\\mathbf{r},t)
$$

Type in the editor and watch this preview update live.
`);
  const [renderedMarkdown, setRenderedMarkdown] = useState(rawMarkdown);
  const lastRenderTimeRef = useRef(Date.now());
  const threshold = 100;
  const interval = 1000; // Reduced to 1 second for better responsiveness

  useEffect(() => {
    const now = Date.now();
    if (rawMarkdown.length - renderedMarkdown.length >= threshold || now - lastRenderTimeRef.current >= interval) {
      setRenderedMarkdown(rawMarkdown);
      lastRenderTimeRef.current = now;
    }
  }, [rawMarkdown, renderedMarkdown.length]);

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" gutterBottom>Live Markdown Preview</Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Editor Section */}
          <Paper sx={{ flex: 1, p: 2, backgroundColor: '#44475a', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Editor</Typography>
            <TextField
              multiline
              fullWidth
              minRows={20}
              variant="outlined"
              value={rawMarkdown}
              onChange={(e) => setRawMarkdown(e.target.value)}
              sx={{ 
                backgroundColor: '#282a36',
                '& .MuiOutlinedInput-root': {
                  color: '#f8f8f2',
                  '& fieldset': {
                    borderColor: '#6272a4',
                  },
                  '&:hover fieldset': {
                    borderColor: '#bd93f9',
                  },
                },
              }}
            />
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => setRenderedMarkdown(rawMarkdown)}>
                Render Now
              </Button>
            </Box>
          </Paper>

          {/* Preview Section */}
          <Paper sx={{ flex: 1, p: 2, backgroundColor: '#44475a', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Preview</Typography>
            <Box 
              sx={{
                p: 2,
                minHeight: '500px',
                backgroundColor: '#282a36', 
                borderRadius: 1,
                overflowY: 'auto',
                '& h1': { fontSize: '2.5rem', fontWeight: 'bold', my: 2 },
                '& h2': { fontSize: '2rem', fontWeight: 'bold', my: 2 },
                '& h3': { fontSize: '1.75rem', fontWeight: 'bold', my: 1.5 },
                '& p': { fontSize: '1rem', my: 1 },
                '& *': { fontFamily: 'inherit' },
              }}
            >
              <MarkdownRenderer content={renderedMarkdown} />
            </Box>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
}