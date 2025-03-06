// pages/preview.tsx
import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import MarkdownRenderer from '../components/markdown/MarkdownRenderer';

export default function PreviewPage() {
  const sampleMarkdown = `
# Sample Document

Inline math: $E = mc^2$

Block equation:
$$
\\int_{0}^{\\infty} e^{-x}\\, dx = 1
$$
`;

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: '#282a36', color: '#f8f8f2', minHeight: '100vh' }}>
      <Typography variant="h3" gutterBottom>Preview Page</Typography>
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
          <MarkdownRenderer content={sampleMarkdown} />
        </Box>
      </Box>
    </Container>
  );
}
