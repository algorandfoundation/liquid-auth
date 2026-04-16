export interface LiquidCredential {
  device?: string;
  publicKey: string;
  credId: string;
  prevCounter: number;
}

export interface LiquidUser {
  id: string;
  wallet: string;
  credentials: LiquidCredential[];
}

export interface StorageAdapter {
  findUserByWallet(wallet: string): Promise<LiquidUser | null>;
  findUserByCredId(credId: string): Promise<LiquidUser | null>;
  createUser(wallet: string): Promise<LiquidUser>;
  updateUser(user: LiquidUser): Promise<void>;

  findSession(sid: string): Promise<any | null>;
  updateSessionWallet(sid: string, wallet: string): Promise<void>;
  
  // Optional rekeying check
  getAccountAuthAddress?(address: string): Promise<string | null>;
}

/**
 * A basic socket interface that can be used with other libraries other than socket.io-client.
 */
export interface SocketAdapter {
  id?: string;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): this;
  disconnect(): this;
  removeAllListeners(event?: string): this;
}

export interface EventsAdapter {
  emit(event: string, data: any): void;
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
}

export interface LiquidExtensionAdapter {
  type: string;
  verify(
    challenge: string,
    signature: string,
    address: string,
    storage: StorageAdapter,
  ): Promise<boolean>;
}

export interface LiquidAuthOptions {
  origin?: string | ((ua: string) => string | string[]);
  storage?: StorageAdapter;
  events?: EventsAdapter;
  logger?: LoggingAdapter;
  rpID?: string;
  rpName?: string;
  extensions?: LiquidExtensionAdapter[];
}

export interface LoggingAdapter {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn?(message: string, ...args: any[]): void;
  debug?(message: string, ...args: any[]): void;
}
