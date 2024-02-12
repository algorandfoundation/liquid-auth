// Modified from: https://github.com/herrjemand/Base64URL-ArrayBuffer
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * Bytes to Base64URL
 * @param {Uint8Array| ArrayBuffer} arr Bytes to convert to URL safe Base64
 */
export function toBase64URL(arr: Uint8Array | ArrayBuffer): string {
    let bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
    let len = bytes.length
    let base64 = "";

    for (let i = 0; i < len; i+=3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
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
    if(typeof base64url !== 'string'){
        throw new TypeError('Must be string!')
    }
    return new Uint8Array(
        atob(base64url.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''))
            .split('')
            .map((c) => c.charCodeAt(0)),
    );
}
