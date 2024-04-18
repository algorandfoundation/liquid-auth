import { useContext, useEffect } from 'react';
import { SignalClientContext } from '@/hooks/useSignalClient.ts';

/**
 * Hook to use data channel messages
 * @param onMessage
 */
export function useDataChannel(onMessage?: (event: MessageEvent) => void) {
  const { dataChannel } = useContext(SignalClientContext);
  useEffect(() => {
    if (!dataChannel || !onMessage) return;
    dataChannel.addEventListener('message', onMessage);
    return () => {
      dataChannel.removeEventListener('message', onMessage);
    };
  }, [dataChannel, onMessage]);

  return dataChannel;
}
