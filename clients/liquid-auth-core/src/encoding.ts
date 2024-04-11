import nacl from "tweetnacl";
import { decodeAsBytes, encode } from "./hi-base32.js";
import { createMethod } from "./sha512.js";
const sha512_256 = createMethod(256);
const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const ALGORAND_PUBLIC_KEY_BYTE_LENGTH = 32;
const ALGORAND_ADDRESS_BYTE_LENGTH = 36;
const ALGORAND_CHECKSUM_BYTE_LENGTH = 4;
const ALGORAND_ADDRESS_LENGTH = 58;
const HASH_BYTES_LENGTH = 32;
export const MALFORMED_ADDRESS_ERROR_MSG = "Malformed address";
export const ALGORAND_ADDRESS_BAD_CHECKSUM_ERROR_MSG = "Bad checksum";
/**
 * Bytes to Base64URL
 * @param {Uint8Array| ArrayBuffer} arr Bytes to convert to URL safe Base64
 */
export function toBase64URL(arr: Uint8Array | ArrayBuffer): string {
  const bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
  const len = bytes.length;
  let base64 = "";

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
  if (typeof base64url !== "string") {
    throw new TypeError("Must be string!");
  }
  return new Uint8Array(
    atob(base64url.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, ""))
      .split("")
      .map((c) => c.charCodeAt(0)),
  );
}

function concatArrays(...arrs: Array<ArrayLike<number>>) {
  const size = arrs.reduce((sum, arr) => sum + arr.length, 0);
  const c = new Uint8Array(size);

  let offset = 0;
  for (let i = 0; i < arrs.length; i++) {
    c.set(arrs[i], offset);
    offset += arrs[i].length;
  }

  return c;
}

export function encodeAddress(address: Uint8Array) {
  // compute checksum
  const checksum = sha512_256
    .array(address)
    .slice(
      nacl.sign.publicKeyLength - ALGORAND_CHECKSUM_BYTE_LENGTH,
      nacl.sign.publicKeyLength,
    );
  const addr = encode(concatArrays(address, checksum));

  return addr.toString().slice(0, ALGORAND_ADDRESS_LENGTH); // removing the extra '===='
}
/**
 * decodeAddress takes an Algorand address in string form and decodes it into a Uint8Array.
 * @param address - an Algorand address with checksum.
 * @returns the decoded form of the address's public key and checksum
 */
export function decodeAddress(address: string): Uint8Array {
  if (
    typeof address !== "string" ||
    address.length !== ALGORAND_ADDRESS_LENGTH
  ) {
    throw new Error(MALFORMED_ADDRESS_ERROR_MSG);
  }

  // try to decode
  const decoded = decodeAsBytes(address.toString());

  // Find publickey and checksum
  const pk = new Uint8Array(
    decoded.slice(
      0,
      ALGORAND_ADDRESS_BYTE_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH,
    ),
  );
  const cs = new Uint8Array(
    decoded.slice(
      ALGORAND_PUBLIC_KEY_BYTE_LENGTH,
      ALGORAND_ADDRESS_BYTE_LENGTH,
    ),
  );

  // Compute checksum
  const checksum = sha512_256
    .array(pk)
    .slice(
      HASH_BYTES_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH,
      HASH_BYTES_LENGTH,
    );

  // Check if the checksum and the address are equal
  if (
    checksum.length !== cs.length ||
    !Array.from(checksum).every((val, i) => val === cs[i])
  ) {
    throw new Error(ALGORAND_ADDRESS_BAD_CHECKSUM_ERROR_MSG);
  }

  return pk;
}

export function base64ToUint8Array(encoded) {
  return new Uint8Array(
    // TODO: Cross-platform solution since atob is deprecated in Node
    atob(encoded)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );
}
