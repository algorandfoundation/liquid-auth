# 💧 Liquid Auth Core

`@algorandfoundation/liquid-core` is a modular middleware suite for implementing Liquid Auth in Express-based applications. It provides authentication, FIDO (WebAuthn), and WebRTC signaling capabilities.

## 🚀 Installation

```bash
npm install @algorandfoundation/liquid-core
```

## 🛠️ Configuration

The middleware is configured using a common `LiquidAuthOptions` object:

```typescript
import { LiquidAuthOptions } from '@algorandfoundation/liquid-core';

const options: LiquidAuthOptions = {
  origin: 'https://your-domain.com',
  storage: myStorageAdapter,
  events: myEventsAdapter,
  logger: myLoggingAdapter,
  rpID: 'your-domain.com',
  rpName: 'Your App Name',
  extensions: [myCustomExtensionAdapter]
};
```

## 📦 Capabilities

You can use the full middleware or mount specific capabilities independently.

### 🔐 Full Authentication Middleware
A composed middleware that mounts both `auth` and `fido` capabilities. Use this for a complete Liquid Auth implementation.

```typescript
import { liquidAuthMiddleware } from '@algorandfoundation/liquid-core';

app.use('/auth', liquidAuthMiddleware(options));
```

### 🆔 FIDO (WebAuthn)
Handles WebAuthn attestation (registration) and assertion (login) flows.

```typescript
import { fido } from '@algorandfoundation/liquid-core/fido';

app.use('/auth/fido', fido(options));
```

#### Routes:
- `POST /attestation/request`: Generates WebAuthn registration options. Requires `{ username, extensions: { liquid: true } }` in the body.
- `POST /attestation/response`: Verifies registration and creates/updates the user. Supports custom extension adapters via `LiquidExtensionAdapter` based on the `type` property (defaults to `ed25519`).
- `POST /assertion/request/:credId`: Generates authentication options for a specific credential.
- `POST /assertion/response`: Verifies authentication and starts the user session.

### 👤 User Auth
Handles user profile retrieval, session status, and logout.

```typescript
import { auth } from '@algorandfoundation/liquid-core/auth';

app.use('/auth', auth(options));
```

#### Routes:
- `GET /user`: Returns the profile of the currently authenticated user.
- `GET /session`: Returns the current session state and associated user info.
- `GET /logout`: Destroys the authentication session and redirects to `/`.
- `DELETE /keys/:id`: Deletes a specific WebAuthn credential from the user's account.

### 📡 Signaling
Provides a WebSocket handler for WebRTC signaling between devices (e.g., browser and mobile wallet).

```typescript
import { signal } from '@algorandfoundation/liquid-core/signal';
import { WebSocketAdapter } from '@algorandfoundation/liquid-core/adapters';

wss.on('connection', (ws, req) => {
  const adapter = new WebSocketAdapter(ws);
  const handler = signal(options);
  handler(adapter, req);
});
```

#### WebSocket Events:
- `link`: Orchestrates the connection between a browser session and a wallet device.
- `offer-description` / `answer-description`: Forwards WebRTC SDP messages to the linked peer.
- `offer-candidate` / `answer-candidate`: Forwards WebRTC ICE candidates to the linked peer.

## 🔌 Adapters

Liquid Auth Core uses adapters to remain platform-agnostic. Each adapter has a specific interface you must implement or use a provided one.

### 💾 StorageAdapter
Handles persistence for users, credentials, and session associations. Required by all middleware components.

```typescript
export interface StorageAdapter {
  findUserByWallet(wallet: string): Promise<LiquidUser | null>;
  findUserByCredId(credId: string): Promise<LiquidUser | null>;
  createUser(wallet: string): Promise<LiquidUser>;
  updateUser(user: LiquidUser): Promise<void>;
  findSession(sid: string): Promise<any | null>;
  updateSessionWallet(sid: string, wallet: string): Promise<void>;
  getAccountAuthAddress?(address: string): Promise<string | null>; // Optional rekeying check
}

export interface LiquidUser {
  id: string; // Internal user ID (e.g., UUID or address)
  wallet: string; // The primary wallet address
  credentials: LiquidCredential[];
}

export interface LiquidCredential {
  credId: string;
  publicKey: string;
  prevCounter: number;
  device?: string;
}
```

### 🔔 EventsAdapter
Used to bridge authentication events (like a successful FIDO login) to other parts of the system, such as the signaling handler.

```typescript
export interface EventsAdapter {
  emit(event: string, data: any): void;
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
}
```

### 📡 SocketAdapter
An abstraction over different WebSocket implementations (e.g., native `ws`, `socket.io`). This allows the signaling logic to be implementation-agnostic.

The core package provides a `WebSocketAdapter` for the standard `ws` library:

```typescript
import { WebSocketAdapter } from '@algorandfoundation/liquid-core/adapters';
```

Interface:

```typescript
export interface SocketAdapter {
  id?: string;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): this;
  disconnect(): this;
  removeAllListeners(event?: string): this;
}
```

### 📝 LoggingAdapter
Provides a structured way to handle logs. If not provided, a no-op logger is used.

```typescript
export interface LoggingAdapter {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn?(message: string, ...args: any[]): void;
  debug?(message: string, ...args: any[]): void;
}
```

### 🧩 LiquidExtensionAdapter
Allows for custom verification logic of the `liquid` extension signatures during WebAuthn registration.

```typescript
export interface LiquidExtensionAdapter {
  type: string; // The identifier for the signature type (e.g., 'ed25519')
  verify(
    challenge: string,
    signature: string,
    address: string,
    storage: StorageAdapter,
  ): Promise<boolean>;
}
```

## ⚙️ Middleware Requirements

Each capability has different adapter requirements:

| Capability | Required | Optional |
| :--- | :--- | :--- |
| **`liquidAuthMiddleware`** | `storage`, `origin` | `events`, `logger`, `extensions`, `rpID`, `rpName` |
| **`fido`** | `storage`, `origin` | `events`, `logger`, `extensions`, `rpID`, `rpName` |
| **`auth`** | `storage` | `logger` |
| **`signal`** | `storage`, `events` | `logger` |

### Optional Adapter Handling
- **Logger**: If no `logger` is provided, the middleware will default to a no-op logger that suppresses all output.
- **Events**: If `events` is missing in `fido`, the middleware will still function, but it won't be able to notify the `signal` handler about successful logins (meaning cross-device linking won't work automatically).
- **Extensions**: If no `extensions` are provided to `fido`, it defaults to the standard `ed25519` verification for Liquid Auth signatures.
- **Origin**: In `fido`, `origin` can be a string or a function that returns the allowed origin based on the request's User-Agent.

## 📄 License

Apache-2.0
