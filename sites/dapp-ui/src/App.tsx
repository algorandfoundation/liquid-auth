import { useState, useMemo } from 'react';

import {
  ColorModeContext,
  DataChannelContext,
  PeerConnectionContext,
  SnackbarContext,
  StateContext,
} from './Contexts';
import Layout from './Layout';

import { HomePage } from './pages/home.tsx';
import { createTheme, CssBaseline } from '@mui/material';
import { DEFAULT_THEME } from './theme.tsx';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '@emotion/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { createHashRouter, RouterProvider } from 'react-router-dom';
import { PeeringPage } from './pages/peering.tsx';
import ConnectedPage from './pages/connected.tsx';
import { Algodv2 } from 'algosdk';
import { AlgodContext } from './hooks/useAlgod.ts';
const queryClient = new QueryClient();

const algod = new Algodv2(
  process.env.VITE_ALGOD_TOKEN || '',
  process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  process.env.VITE_ALGOD_PORT || 443,
);
const DEFAULT_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

const router = createHashRouter([
  {
    path: '/',
    element: (
      <Layout>
        <HomePage />
      </Layout>
    ),
  },
  {
    path: '/peering',
    element: (
      <Layout>
        <PeeringPage />
      </Layout>
    ),
  },
  {
    path: '/connected',
    element: (
      <Layout>
        <ConnectedPage />
      </Layout>
    ),
  },
]);
export default function ProviderApp() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [state, setState] = useState('peering');
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  const peerConnection = useMemo(
    () => new RTCPeerConnection(DEFAULT_CONFIG),
    [],
  );
  const [mode, setMode] = useState<'light' | 'dark'>(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
      ? 'dark'
      : 'light',
  );
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
        palette:
          mode === 'dark'
            ? {
                primary: { main: '#9966ff' },
                mode: 'dark',
              }
            : { ...DEFAULT_THEME.palette },
      }),
    [mode],
  );
  console.log(theme, DEFAULT_THEME.palette);
  return (
    <AlgodContext.Provider value={{ algod }}>
      <QueryClientProvider client={queryClient}>
        <SnackbarContext.Provider
          value={{ open, setOpen, message, setMessage }}
        >
          <StateContext.Provider value={{ state, setState }}>
            <ColorModeContext.Provider value={colorMode}>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <PeerConnectionContext.Provider value={{ peerConnection }}>
                  <DataChannelContext.Provider
                    value={{ dataChannel, setDataChannel }}
                  >
                    <RouterProvider router={router} />
                  </DataChannelContext.Provider>
                </PeerConnectionContext.Provider>
                <ReactQueryDevtools initialIsOpen={false} />
              </ThemeProvider>
            </ColorModeContext.Provider>
          </StateContext.Provider>
        </SnackbarContext.Provider>
      </QueryClientProvider>
    </AlgodContext.Provider>
  );
}
