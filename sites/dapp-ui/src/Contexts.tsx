import { createContext } from 'react';

export const ColorModeContext = createContext({ toggle: () => {} });

export const StateContext = createContext({
  state: 'debug',
  setState: (_: string) => {
    console.log(_);
  },
});

export const SnackbarContext = createContext({
  open: false,
  setOpen: (_: boolean) => {
    console.log(_);
  },
  message: '',
  setMessage: (_: string) => {
    console.log(_);
  },
});

export { DataChannelContext } from './hooks/useDataChannel.ts';
export { PeerConnectionContext } from './hooks/usePeerConnection.ts';
