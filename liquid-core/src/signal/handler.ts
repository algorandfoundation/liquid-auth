import { LiquidAuthOptions, SocketAdapter } from '../types.js';

export function signal(
  options: LiquidAuthOptions,
) {
  const { storage, events } = options;
  const logger = options.logger || {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  };

  if (!storage || !events) {
    throw new Error('StorageAdapter and EventsAdapter are required for WebSocket handling');
  }

  const rooms = new Map<string, Set<SocketAdapter>>();
  const socketRooms = new Map<SocketAdapter, Set<string>>();

  const joinRoom = (room: string, socket: SocketAdapter) => {
    if (!room) return;
    logger.debug?.(`Socket joining room: ${room}`);
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room)!.add(socket);
    
    if (!socketRooms.has(socket)) socketRooms.set(socket, new Set());
    socketRooms.get(socket)!.add(room);
  };

  const leaveRoom = (room: string, socket: SocketAdapter) => {
    logger.debug?.(`Socket leaving room: ${room}`);
    const s = rooms.get(room);
    if (s) {
      s.delete(socket);
      if (s.size === 0) rooms.delete(room);
    }
    const r = socketRooms.get(socket);
    if (r) {
      r.delete(room);
      if (r.size === 0) socketRooms.delete(socket);
    }
  };

  const leaveAllRooms = (socket: SocketAdapter) => {
    const r = socketRooms.get(socket);
    if (r) {
      for (const room of Array.from(r)) {
        leaveRoom(room, socket);
      }
    }
  };

  const broadcastToRoom = (room: string, event: string, data: any, excludeSocket?: SocketAdapter) => {
    const s = rooms.get(room);
    if (s) {
      for (const socket of Array.from(s)) {
        if (socket !== excludeSocket) {
          try {
            socket.emit(event, data);
          } catch (e) {
            // Socket might be closed
          }
        }
      }
    }
  };

  events.on('auth', (data: any) => {
    if (data.sessionId && data.wallet) {
      const s = rooms.get(data.sessionId);
      if (s) {
        for (const socket of Array.from(s)) {
          joinRoom(data.wallet, socket);
        }
      }
    }
  });

  events.on('signal', (data: any) => {
    if (data.room && data.event && data.payload) {
      broadcastToRoom(data.room, data.event, data.payload, undefined);
    }
  });

  return (socket: SocketAdapter, req: any) => {
    const session = req.session as any;
    const sessionId = req.sessionID || session?.id;

    logger.info(`New WebSocket connection. SessionId: ${sessionId}, Wallet: ${session?.wallet || 'none'}`);

    if (sessionId) {
      joinRoom(sessionId, socket);
    }

    if (session?.wallet) {
      joinRoom(session.wallet, socket);
    }

    let linkListener: any = null;
    const cleanupLink = () => {
      if (linkListener) {
        events.off('auth', linkListener);
        linkListener = null;
      }
    };

    socket.on('link', async (data: any, ack?: (data: any) => void) => {
      logger.info(`Received link request for requestId: ${data.requestId}`);
      if (typeof session?.reload === 'function') {
        await new Promise((resolve) => session.reload(() => resolve(null)));
      }

      if (sessionId) {
        cleanupLink();
        linkListener = (authData: any) => {
          if (authData.requestId === data.requestId) {
            logger.info(`Link successful for requestId: ${data.requestId}, wallet: ${authData.wallet}`);
            (socket as any).wallet = authData.wallet;
            const linkData = {
              requestId: authData.requestId,
              wallet: authData.wallet,
              credId: authData.credId,
            };
            if (ack) {
              ack({ data: linkData });
            } else {
              socket.emit('link', linkData);
            }
            joinRoom(authData.wallet, socket);
            cleanupLink();
          }
        };
        events.on('auth', linkListener);
      }
    });

    const signalEvents = [
      'offer-candidate',
      'offer-description',
      'answer-description',
      'answer-candidate',
    ];

    for (const event of signalEvents) {
      socket.on(event, async (data: any) => {
        const wallet = session?.wallet || (socket as any).wallet;
        logger.debug?.(`Received signaling event ${event} from socket (wallet: ${wallet || 'unknown'})`);
        
        if (typeof session?.reload === 'function') {
          await new Promise((resolve) => session.reload(() => resolve(null)));
        }

        const updatedWallet = session?.wallet || (socket as any).wallet;

        if (updatedWallet) {
          logger.info?.(`Forwarding ${event} to room: ${updatedWallet}`);
          broadcastToRoom(updatedWallet, event, data, socket);
          events.emit('signal', {
            room: updatedWallet,
            event,
            payload: data,
            excludeSessionId: sessionId,
          });
        } else {
          logger.warn?.(`Received ${event} but no wallet associated with session ${sessionId}`);
        }
      });
    }

    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected. SessionId: ${sessionId}`);
      cleanupLink();
      leaveAllRooms(socket);
    });
  };
}
