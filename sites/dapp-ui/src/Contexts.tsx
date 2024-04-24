import { createContext } from 'react';

export const ColorModeContext = createContext({ toggle: () => {} });
export { SignalClientContext } from './hooks/useSignalClient.ts';
