// pages/live-preview.tsx
import React, { useState } from 'react';
import { Container, Box, Typography, TextField } from '@mui/material';
import MarkdownRenderer from '../components/MarkdownRenderer';

export default function LivePreview() {
  const [markdown, setMarkdown] = useState(`# Hello!

This is inline math: $E = mc^2$

Here is a block equation:

$$
\\int_0^\\infty e^{-x} dx = 1
$$

Type above and watch this preview update live.
`);

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#282a36', color: '#f8f8f2', minHeight: '100vh' }}>
      <Typography variant="h3" gutterBottom>
        Live Markdown Preview
      </Typography>
      <TextField
        multiline
        fullWidth
        minRows={6}
        variant="outlined"
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        sx={{
          backgroundColor: '#44475a',
          input: { color: '#f8f8f2' },
          mb: 3,
        }}
      />
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
          <MarkdownRenderer content={markdown} />
        </Box>
      </Box>
    </Container>
  );
}
