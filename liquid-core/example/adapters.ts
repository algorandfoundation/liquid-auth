import { EventEmitter } from 'events';
import { 
  StorageAdapter, 
  EventsAdapter, 
  LiquidUser,
  LoggingAdapter
} from '../src/types.js';

/**
 * Example of an in-memory StorageAdapter.
 * In a production app, this would use a database (e.g., MongoDB, PostgreSQL, Redis).
 */
const users = new Map<string, LiquidUser>();
export const storage: StorageAdapter = {
  async findUserByWallet(wallet: string) {
    return Array.from(users.values()).find(u => u.wallet === wallet) || null;
  },
  async findUserByCredId(credId: string) {
    return Array.from(users.values()).find(u => u.credentials.some(c => c.credId === credId)) || null;
  },
  async createUser(wallet: string) {
    const user: LiquidUser = { id: wallet, wallet, credentials: [] };
    users.set(user.id, user);
    return user;
  },
  async updateUser(user: LiquidUser) {
    users.set(user.id, user);
  },
  async findSession(sid: string) {
    // In a real app, you would look this up in your session store (e.g., Redis)
    return null; 
  },
  async updateSessionWallet(sid: string, wallet: string) {
    // Map the wallet to the session ID in your session store
  },
  // Optional: check for rekeyed accounts
  async getAccountAuthAddress(address: string) {
    return null;
  }
};

/**
 * Example of an EventsAdapter using Node's EventEmitter.
 * In a production multi-instance app, this would use Redis pub/sub.
 */
const emitter = new EventEmitter();
export const events: EventsAdapter = {
  emit: (event, data) => emitter.emit(event, data),
  on: (event, cb) => emitter.on(event, cb),
  off: (event, cb) => emitter.off(event, cb),
};

/**
 * Example of a LoggingAdapter using console.
 */
export const logger: LoggingAdapter = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  debug: (msg) => console.debug(`[DEBUG] ${msg}`),
};
