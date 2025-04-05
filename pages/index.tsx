// pages/index.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  Button, Typography, Box, Grid, Card, CardContent, 
  CardActions, TextField, InputAdornment, IconButton,
  Chip, Divider, CircularProgress
} from '@mui/material';
import Layout from '../components/common/Layout';
// Assume you have these icons or replace with appropriate ones
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import ComputerIcon from '@mui/icons-material/Computer';
import ScienceIcon from '@mui/icons-material/Science';
import SchoolIcon from '@mui/icons-material/School';

interface DocumentRow {
  id: string;
  title?: string;
  created_at?: string;
  category?: string;
}

const RESEARCH_CATEGORIES = [
  { name: 'Computer Science', icon: <ComputerIcon />, color: '#8be9fd' },
  { name: 'Medical', icon: <ScienceIcon />, color: '#50fa7b' },
  { name: 'History', icon: <SchoolIcon />, color: '#f1fa8c' },
];

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, created_at, category');
      if (error) console.error('Error fetching documents:', error);
      else setDocuments(data || []);
      setLoading(false);
    };
    fetchDocuments();
  }, []);

  const createDocument = () => {
    const newDocId = uuidv4();
    router.push(`/doc/${newDocId}?token=edit123`);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      (doc.title && doc.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          fontWeight: 'bold',
          color: '#bd93f9',
          borderBottom: '2px solid #6272a4',
          pb: 1
        }}>
          Research Dashboard
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#f8f8f2' }}>
            Research Categories
          </Typography>
          <Grid container spacing={2}>
            {RESEARCH_CATEGORIES.map((category) => (
              <Grid item key={category.name} xs={6} sm={3}>
                <Card 
                  sx={{ 
                    backgroundColor: selectedCategory === category.name ? 
                      `${category.color}22` : '#44475a',
                    border: selectedCategory === category.name ? 
                      `2px solid ${category.color}` : '1px solid #6272a4',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    },
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.name ? null : category.name
                  )}
                >
                  <CardContent sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: 2
                  }}>
                    <Box sx={{ 
                      color: category.color,
                      fontSize: '2rem',
                      mb: 1
                    }}>
                      {category.icon}
                    </Box>
                    <Typography variant="subtitle1" sx={{ color: '#f8f8f2' }}>
                      {category.name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          <TextField
            placeholder="Search documents..."
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#6272a4' }} />
                </InputAdornment>
              ),
              sx: { 
                backgroundColor: '#44475a',
                color: '#f8f8f2',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#6272a4'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#bd93f9'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#bd93f9'
                }
              }
            }}
            sx={{ maxWidth: { sm: '70%' } }}
          />
          
          <Button 
            variant="contained" 
            onClick={createDocument}
            startIcon={<AddIcon />}
            sx={{ 
              backgroundColor: '#50fa7b',
              color: '#282a36',
              '&:hover': { backgroundColor: '#69ff9a' },
              fontWeight: 'bold',
              minWidth: { xs: '100%', sm: 'auto' }
            }}
          >
            New Document
          </Button>
        </Box>
        
        {selectedCategory && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1, color: '#f8f8f2' }}>
              Filtered by:
            </Typography>
            <Chip
              label={selectedCategory}
              onDelete={() => setSelectedCategory(null)}
              sx={{ 
                backgroundColor: '#6272a4',
                color: '#f8f8f2'
              }}
            />
          </Box>
        )}
        
        <Divider sx={{ borderColor: '#6272a4', my: 2 }} />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#bd93f9' }} />
        </Box>
      ) : filteredDocuments.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 4, 
          backgroundColor: '#44475a', 
          borderRadius: 2,
          p: 4
        }}>
          <DescriptionIcon sx={{ fontSize: 60, color: '#6272a4', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#f8f8f2' }}>
            No documents found
          </Typography>
          <Typography variant="body2" sx={{ color: '#f8f8f2', mb: 2 }}>
            {searchTerm || selectedCategory ? 
              'Try adjusting your search or filters' : 
              'Create your first document to get started'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={createDocument}
            startIcon={<AddIcon />}
            sx={{
              backgroundColor: '#50fa7b',
              color: '#282a36',
              '&:hover': { backgroundColor: '#69ff9a' }
            }}
          >
            Create Document
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredDocuments.map((doc) => (
            <Grid item key={doc.id} xs={12} sm={6} md={4}>
              <Card sx={{ 
                backgroundColor: '#44475a',
                border: '1px solid #6272a4',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
                  borderColor: '#bd93f9'
                },
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <CardContent sx={{ flex: 1 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#f8f8f2',
                      mb: 1,
                      fontWeight: 'medium',
                      borderBottom: '1px solid #6272a4',
                      pb: 1
                    }}
                    noWrap
                  >
                    {doc.title || `Document ${doc.id.substring(0, 8)}`}
                  </Typography>
                  
                  <Typography variant="caption" sx={{ color: '#f8f8f2', display: 'block', mb: 2 }}>
                    Created: {formatDate(doc.created_at)}
                  </Typography>
                  
                  {doc.category && (
                    <Chip 
                      label={doc.category} 
                      size="small"
                      sx={{ 
                        backgroundColor: '#6272a4',
                        color: '#f8f8f2'
                      }}
                    />
                  )}
                </CardContent>
                <CardActions>
                  <Button 
                    component={Link}
                    href={`/doc/${doc.id}?token=edit123`}
                    fullWidth
                    sx={{ 
                      color: '#8be9fd',
                      '&:hover': {
                        backgroundColor: 'rgba(139, 233, 253, 0.1)'
                      }
                    }}
                  >
                    Open Document
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Layout>
  );
}