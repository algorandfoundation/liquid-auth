import { createContext, useContext } from 'react';
import { SignalClient } from '@liquid/auth-client/signal';

type SignalClientState = {
  client: SignalClient | null;
  setClient: (_: SignalClient) => void;
  status: 'connected' | 'disconnected';
  setStatus: (_: 'connected' | 'disconnected') => void;
  dataChannel: RTCDataChannel | null;
  setDataChannel: (_: RTCDataChannel) => void;
};
export const SignalClientContext = createContext({
  client: null,
  setClient: (_: SignalClient) => {
    console.log(_);
  },
  status: 'disconnected',
  setStatus: (_: 'connected' | 'disconnected') => {
    console.log(_);
  },
  dataChannel: null,
  setDataChannel: (_: RTCDataChannel) => {
    console.log(_);
  },
} as SignalClientState);

export function useSignalClient() {
  const { client, status, dataChannel } = useContext(SignalClientContext);
  if (!client)
    throw new Error(
      'SignalClient not found, make sure to wrap your component with <SignalClientProvider>',
    );
  return { client, status, dataChannel };
}
