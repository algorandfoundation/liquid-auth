import { useContext, ReactElement, useState, useMemo } from 'react';

import { ColorModeContext, StateContext } from './Contexts';
import Layout from './Layout';

import { GetStartedCard } from './pages/home/GetStarted';
import { WaitForRegistrationCard } from './pages/dashboard/WaitForRegistration';
import { RegisteredCard } from './pages/dashboard/Registered';
import { createTheme, CssBaseline } from '@mui/material';
import { DEFAULT_THEME } from './theme.tsx';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '@emotion/react';

const queryClient = new QueryClient()

export default function ProviderApp(){
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
                      <App/>
                  </ThemeProvider>
              </ColorModeContext.Provider>
          </StateContext.Provider>
      </QueryClientProvider>
    )
}

export function App() {
  const { state } = useContext(StateContext);

  // Authentication Steps
  const STATES: { [k: string]: () => ReactElement } = {
    'start': GetStartedCard,
    'connected': WaitForRegistrationCard,
    'registered': RegisteredCard,
  };
  const Content = STATES[state];

  return (
    <Layout>
      <Content />
    </Layout>
  );
}
