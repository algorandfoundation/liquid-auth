import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material';
import { PropsWithChildren, useContext } from 'react';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { ColorModeContext } from './Contexts';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { SessionMenu } from './components/user/SessionMenu.tsx';
import { MessageSnackbar } from './components/Snackbar.tsx';
import { useLocation, useNavigate } from 'react-router-dom';
export default function Layout({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const bubbleStyle = {
    backgroundColor: isDarkMode ? 'white' : 'black',
  };
  const breadcrumbs = ['/', '/peering', '/connected', '/registered'];
  const index = breadcrumbs.indexOf(location.pathname);
  return (
    <>
      <AppBar
        position="sticky"
        sx={isDarkMode ? { background: 'transparent', boxShadow: 'none' } : {}}
      >
        <Toolbar>
          <SessionMenu />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Liquid dApp
          </Typography>
          <IconButton
            onClick={() => {
              index > 0 && navigate(breadcrumbs[index - 1]);
            }}
            aria-label="delete"
            disabled={index === 0}
            color="inherit"
          >
            <NavigateBeforeIcon />
          </IconButton>
          <IconButton
            onClick={() => {
              index < breadcrumbs.length - 1 &&
                navigate(breadcrumbs[index + 1]);
            }}
            aria-label="delete"
            disabled={index === breadcrumbs.length - 1}
            color="inherit"
          >
            <NavigateNextIcon />
          </IconButton>
          <IconButton
            sx={{ ml: 1 }}
            onClick={colorMode.toggle}
            color="inherit"
            aria-label="Switch theme"
          >
            {theme.palette.mode === 'dark' ? (
              <Brightness7Icon />
            ) : (
              <Brightness4Icon />
            )}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        maxWidth="md"
        sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'auto' }}
      >
        <Box sx={{ my: 4, flex: 1 }}>
          {children}
          <MessageSnackbar />
        </Box>
      </Container>
      <div className="ocean">
        <div className="bubble bubble--1" style={bubbleStyle}></div>
        <div className="bubble bubble--2" style={bubbleStyle}></div>
        <div className="bubble bubble--3" style={bubbleStyle}></div>
        <div className="bubble bubble--4" style={bubbleStyle}></div>
        <div className="bubble bubble--5" style={bubbleStyle}></div>
        <div className="bubble bubble--6" style={bubbleStyle}></div>
        <div className="bubble bubble--7" style={bubbleStyle}></div>
        <div className="bubble bubble--8" style={bubbleStyle}></div>
        <div className="bubble bubble--9" style={bubbleStyle}></div>
        <div className="bubble bubble--10" style={bubbleStyle}></div>
        <div className="bubble bubble--11" style={bubbleStyle}></div>
        <div className="bubble bubble--12" style={bubbleStyle}></div>
      </div>
    </>
  );
}
