import { createContext } from 'react';

export const ColorModeContext = createContext({ toggle: () => {} });

export const StateContext = createContext({
  state: 'debug',
  setState: (_: string) => {},
});

export const SnackbarContext = createContext({
  open: false,
  setOpen: (_: boolean) => {},
  message: '',
  setMessage: (_: string) => {},
});

export { DataChannelContext } from './hooks/useDataChannel.ts';
export { PeerConnectionContext } from './hooks/usePeerConnection.ts';
