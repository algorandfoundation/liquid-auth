import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// "undefined" means the URL will be computed from the `window.location` object
const URL = `${window.location.origin}`;

export const socket = io(URL, {autoConnect: true});

export function useSocket(){

  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      console.log('Connected')
      setIsConnected(true);
    }

    function onDisconnect() {
      console.log('Disconnected')
      setIsConnected(false);
    }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { isConnected, socket}
}
