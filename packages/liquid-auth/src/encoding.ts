import { decodeAddress as decode } from '@algorandfoundation/algokit-utils';

export function decodeAddress(address: string): Uint8Array {
  return decode(address).publicKey;
}

export function toBase64URL(buffer: ArrayBuffer | Uint8Array): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function fromBase64URL(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
