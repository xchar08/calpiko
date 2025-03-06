// pages/live-preview.tsx
import { useState, useEffect, useRef } from 'react';
import { Container, Box, Typography, TextField, Button } from '@mui/material';
import MarkdownRenderer from '../components/markdown/MarkdownRenderer';

export default function LivePreview() {
  const [rawMarkdown, setRawMarkdown] = useState(`# Hello!

This is inline math: $E = mc^2$

Here is a block equation:

$$
\\int_0^\\infty e^{-x} dx = 1
$$

Type above and watch this preview update live.
`);
  const [renderedMarkdown, setRenderedMarkdown] = useState(rawMarkdown);
  const lastRenderTimeRef = useRef(Date.now());
  const threshold = 100;
  const interval = 30000;

  useEffect(() => {
    const now = Date.now();
    if (rawMarkdown.length - renderedMarkdown.length >= threshold || now - lastRenderTimeRef.current >= interval) {
      setRenderedMarkdown(rawMarkdown);
      lastRenderTimeRef.current = now;
    }
  }, [rawMarkdown, renderedMarkdown.length]);

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#282a36', color: '#f8f8f2', minHeight: '100vh' }}>
      <Typography variant="h3" gutterBottom>Live Markdown Preview</Typography>
      <TextField
        multiline
        fullWidth
        minRows={6}
        variant="outlined"
        value={rawMarkdown}
        onChange={(e) => setRawMarkdown(e.target.value)}
        sx={{ backgroundColor: '#44475a', input: { color: '#f8f8f2' }, mb: 3 }}
      />
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => setRenderedMarkdown(rawMarkdown)}>
          Render Now
        </Button>
      </Box>
      <Box sx={{ border: '1px solid #6272a4', backgroundColor: '#44475a', p: 2, borderRadius: 1 }}>
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
          <MarkdownRenderer content={renderedMarkdown} />
        </Box>
      </Box>
    </Container>
  );
}
