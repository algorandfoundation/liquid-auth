import { auth } from './auth/index.js';
import { fido } from './fido/index.js';
import { LiquidAuthOptions } from './types.js';

export * from './types.js';
export * from './adapters/index.js';
export * from './auth/index.js';
export * from './fido/index.js';
export * from './signal/index.js';

/**
 * Composed middleware for both general auth and FIDO (WebAuthn) routes.
 */
export function liquidAuthMiddleware(options: LiquidAuthOptions) {
  return [auth(options), fido(options)];
}