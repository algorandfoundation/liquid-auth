import './index.css'
import {StrictMode, useMemo, useState} from 'react';
import * as ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@emotion/react';
import {createTheme, CssBaseline} from '@mui/material';
import {DEFAULT_THEME} from './theme';
import App from './App';
import {ColorModeContext, StateContext} from "./Contexts";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient()
function ProviderApp(){
  const [state, setState] = useState('start')

    const [mode, setMode] = useState<'light' | 'dark'>(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)') ? 'dark' : 'light');
    const colorMode = useMemo(
        () => ({
            toggle: () => {
                setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
            },
        }),
        [],
    );

    const theme = useMemo(
        () =>
            createTheme({
                ...DEFAULT_THEME,
                palette: {
                    ...DEFAULT_THEME.palette,
                    mode,
                },
            }),
        [mode],
    );
    return (
      <QueryClientProvider client={queryClient}>
      <StateContext.Provider value={{state, setState}}>
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App hasSession={false}/>
            </ThemeProvider>
        </ColorModeContext.Provider>
      </StateContext.Provider>
      </QueryClientProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ProviderApp/>
    </StrictMode>,
);
