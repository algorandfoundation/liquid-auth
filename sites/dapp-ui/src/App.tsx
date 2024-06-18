import { useState, useMemo, useEffect } from 'react';

import { ColorModeContext } from './Contexts';
import Layout from './Layout';
import { createTheme, CssBaseline } from '@mui/material';
import { DEFAULT_THEME } from './theme.tsx';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '@emotion/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { createHashRouter, RouterProvider } from 'react-router-dom';
import { HomePage, ConnectedPage } from '@/pages';
import { Algodv2 } from 'algosdk';
import { AlgodContext } from '@/hooks';
import { SignalClientContext } from '@/hooks/useSignalClient.ts';
import { LinkMessage, SignalClient } from '@algorandfoundation/liquid-client';
import { useAddressStore } from '@/store';
const queryClient = new QueryClient();

const algod = new Algodv2(
  import.meta.env.VITE_ALGOD_TOKEN || '',
  import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  import.meta.env.VITE_ALGOD_PORT || 443,
);

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
    path: '/connected',
    element: (
      <Layout>
        <ConnectedPage />
      </Layout>
    ),
  },
]);
export default function ProviderApp() {
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const setAddress = useAddressStore((state) => state.setAddress);
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

  const [client, setClient] = useState<SignalClient | null>(
    new SignalClient(window.origin),
  );
  const [status, setStatus] = useState<'connected' | 'disconnected'>(
    'disconnected',
  );
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    if (!client) return;
    function handleDataChannel(dc: RTCDataChannel) {
      console.log('SignalClient datachannel', dc);
      if(client && typeof client.peerClient !== 'undefined') {
        client.peerClient.onconnectionstatechange = () => {
          if(client.peerClient?.connectionState === 'failed'){
            client.close()
            setDataChannel(null)
          }
        }
      }
      setLoading(false);
      setDataChannel(dc);
    }
    client.on('offer-description', (description) => {
      console.log({ 'offer-description': description });
    });
    client.on('offer-candidate', (candidate) => {
      console.log({ 'offer-candidate': candidate });
    });

    client.on('answer-description', (description) => {
      console.log({ 'answer-description': description });
    });
    client.on('answer-candidate', (candidate) => {
      console.log({ 'answer-candidate': candidate });
    });
    client.on('data-channel', handleDataChannel);
    function handleSocketConnect() {
      console.log('Socket Connect');
      setStatus('connected');
    }
    client.on('connect', handleSocketConnect);
    function handleLinkMessage(msg: LinkMessage) {
      console.log('LinkMessage', msg);
      setLoading(true);
      setAddress(msg.wallet);
    }
    client.on('link-message', handleLinkMessage);

    function handleSocketDisconnect() {
      console.log('Socket Disconnect');
      setStatus('disconnected');
    }
    client.on('disconnect', handleSocketDisconnect);
    return () => {
      console.log('removing emitters');
      client.off('link-message', handleLinkMessage);
      client.off('data-channel', handleDataChannel);
      client.off('connect', handleSocketConnect);
      client.off('disconnect', handleSocketDisconnect);
    };
  }, [client, setAddress]);
  return (
    <SignalClientContext.Provider
      value={{
        client,
        setClient,
        status,
        setStatus,
        loading,
        setLoading,
        dataChannel,
        setDataChannel,
      }}
    >
      <AlgodContext.Provider value={{ algod }}>
        <QueryClientProvider client={queryClient}>
          <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <RouterProvider router={router} />
              <ReactQueryDevtools initialIsOpen={false} />
            </ThemeProvider>
          </ColorModeContext.Provider>
        </QueryClientProvider>
      </AlgodContext.Provider>
    </SignalClientContext.Provider>
  );
}
