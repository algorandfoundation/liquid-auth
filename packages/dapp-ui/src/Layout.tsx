import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import { Avatar, Badge, useTheme } from '@mui/material';
import { PropsWithChildren, useContext } from 'react';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { ColorModeContext, StateContext } from './Contexts';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useSocket } from './hooks/useSocket';
export default function Layout({children, hasSession}: {hasSession: boolean} & PropsWithChildren) {
  const {state, setState} = useContext(StateContext)
  const colorMode = useContext(ColorModeContext)
  const theme = useTheme()
  const {isConnected} = useSocket()
  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            disabled={state === 'start'}
          >
            <Badge variant="dot" color={isConnected ? "success" : "error"}>
              <Avatar alt="Remy Sharp" src="/logo.png" />
            </Badge>
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Avicennia
          </Typography>
          <IconButton onClick={() => {
            setState(state === 'registered' ? 'connected' : 'start')
          }} aria-label="delete" disabled={state === 'start'} color="inherit">
            <NavigateBeforeIcon />
          </IconButton>
          <IconButton onClick={() => {
            setState(state === 'start' ? 'connected' : 'registered')
          }} aria-label="delete" disabled={state === 'registered' && hasSession} color="inherit">
            <NavigateNextIcon />
          </IconButton>
          <IconButton sx={{ ml: 1 }} onClick={colorMode.toggle} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <div id="leaves" style={{zIndex: -1}}>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
      </div>
      <Container component="main" maxWidth="md" sx={{ display: "flex", height: "calc(100vh - 64px)", overflow: "auto" }}>
        <Box sx={{ my: 4, flex: 1 }}>
          {children}
        </Box>
      </Container>
    </>
  );
}
