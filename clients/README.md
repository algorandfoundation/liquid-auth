# Overview

Client JSON-RPC interfaces are generated from OpenAPI 3.0 specifications.
All clients should mirror the same interfaces and include the same parameters (as much as possible).

```typescript
interface SignalClient {
  readonly url: string; // Origin of the service
  type: "offer" | "answer" // Type of client
  peerClient: RTCPeerConnection | PeerClient // Native WebRTC Wrapper/Interface
  socket: Socket // The socket to the service

  readonly authenticated: boolean; // State of authentication
  readonly requestId?: string; // The current request being signaled

  /**
   * Generate a Request ID
   */
  generateRequestId(): any;

  /**
   * Top level Friendly interface for signaling
   * @param args
   */
  peer(requestId: any, type: 'offer' | 'answer', config?: RTCConfiguration): Promise<void>;

  /**
   * Link a Request ID to this client
   * @param args
   */
  link(...args: any[]): Promise<LinkMessage>;

  /**
   * Wait for a desciption signal
   * @param args
   */
  signal(...args: any[]): Promise<string>;

  /**
   * Terminate the signaling session
   */
  close(): void
  
  
  /**
   * Listen to Interface events
   * @param args
   */
  on(...args: any[]): void;

  /**
   * Emit an event to the interface
   * @param channel
   * @param callback
   */
  emit(channel: string, callback: (...args: any[])=>void)

}
```
