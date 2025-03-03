// theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: "#282a36",   // Overall background
      paper: "#44475a",     // Surfaces (e.g. editors, cards)
    },
    text: {
      primary: "#f8f8f2",   // Main text color
    },
    primary: {
      main: "#6272a4",      // Primary accent (buttons, borders)
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export default theme;
