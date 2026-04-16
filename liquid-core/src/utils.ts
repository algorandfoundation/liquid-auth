import * as express from 'express';
import { LiquidAuthOptions, StorageAdapter } from './types.js';
import { DefaultLiquidExtensionAdapter, verifyLiquidSignature } from './adapters/index.js';

export function getCommonOptions(options: LiquidAuthOptions) {
  const { origin, storage, events } = options;

  const logger = {
    info: options.logger?.info || (() => {}),
    error: options.logger?.error || (() => {}),
    warn: options.logger?.warn || (() => {}),
    debug: options.logger?.debug || (() => {}),
  };

  const getOrigin = (req: express.Request) => {
    if (typeof origin === 'function') {
      return origin(req.headers['user-agent'] || '');
    }
    return origin || '';
  };

  const getRPID = (req: express.Request) => {
    if (options.rpID) {
      return options.rpID;
    }
    const o = getOrigin(req);
    const primaryOrigin = Array.isArray(o) ? o[0] : o;
    try {
      return new URL(primaryOrigin).hostname;
    } catch (e) {
      return primaryOrigin;
    }
  };

  return { logger, getOrigin, getRPID, storage, events, origin, extensions: options.extensions || [DefaultLiquidExtensionAdapter] };
}

export { DefaultLiquidExtensionAdapter, verifyLiquidSignature };

const INVALID_BASE64URL_INPUT = 'Invalid base64url input';
const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/**
 * Bytes to Base64URL
 * @param {Uint8Array| ArrayBuffer} arr Bytes to convert to URL safe Base64
 */
export function toBase64URL(arr: Uint8Array | ArrayBuffer): string {
  const bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
  const len = bytes.length;
  let base64 = '';
  for (let i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if (len % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1);
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2);
  }

  return base64;
}

/**
 * Base64URL to Bytes
 * @param {string} base64url URL safe Base64 string
 */
export function fromBase64Url(base64url: string): Uint8Array {
  if (typeof base64url !== 'string') {
    throw new Error(INVALID_BASE64URL_INPUT);
  }
  return new Uint8Array(
    // TODO: Cross-platform solution since atob is deprecated in Node
    atob(base64url.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''))
      .split('')
      .map((c) => c.charCodeAt(0)),
  );
}
