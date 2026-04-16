import { EventEmitter } from 'node:events';
import { SocketAdapter } from '../types.js';

export class WebSocketAdapter implements SocketAdapter {
  private events = new EventEmitter();

  constructor(private ws: any) {
    this.ws.on('message', (message: any) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.callbackId !== undefined) {
          const ack = (ackData: any) => {
            this.ws.send(JSON.stringify({ callbackId: payload.callbackId, data: ackData }));
          };
          this.events.emit(payload.event, payload.data, ack);
        } else {
          this.events.emit(payload.event, payload.data);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });

    this.ws.on('close', () => {
      this.events.emit('disconnect');
    });

    this.ws.on('error', (error: any) => {
      this.events.emit('error', error);
    });
  }

  get id() {
    return (this.ws as any).id || (this.ws as any)._id || 'server-socket';
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.events.on(event, listener);
    return this;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    this.events.once(event, listener);
    return this;
  }

  emit(event: string, ...args: any[]): this {
    const data = args.length > 1 ? args : args[0];
    if (this.ws.readyState === 1 /* OPEN */) {
      this.ws.send(JSON.stringify({ event, data }));
    }
    return this;
  }

  disconnect(): this {
    this.ws.close();
    return this;
  }

  removeAllListeners(event?: string): this {
    this.events.removeAllListeners(event);
    return this;
  }
}
