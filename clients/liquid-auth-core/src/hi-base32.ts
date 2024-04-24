/*
 * [hi-base32]{@link https://github.com/emn178/hi-base32}
 *
 * @version 0.5.1
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2015-2021
 * @license MIT
 */
const BASE32_ENCODE_CHAR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".split("");
const BASE32_DECODE_CHAR: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
  2: 26,
  3: 27,
  4: 28,
  5: 29,
  6: 30,
  7: 31,
};

export const decodeAsBytes = function (base32Str: string): number[] {
  if (base32Str === "") {
    return [];
  } else if (!/^[A-Z2-7=]+$/.test(base32Str)) {
    throw new Error("Invalid base32 characters");
  }
  base32Str = base32Str.replace(/=/g, "");
  let v1;
  let v2;
  let v3;
  let v4;
  let v5;
  let v6;
  let v7;
  let v8;
  const bytes: number[] = [];
  let index = 0;
  const length = base32Str.length;

  // 4 char to 3 bytes
  for (var i = 0, count = (length >> 3) << 3; i < count; ) {
    v1 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v2 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v3 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v4 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v5 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v6 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v7 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v8 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    bytes[index++] = ((v1 << 3) | (v2 >>> 2)) & 255;
    bytes[index++] = ((v2 << 6) | (v3 << 1) | (v4 >>> 4)) & 255;
    bytes[index++] = ((v4 << 4) | (v5 >>> 1)) & 255;
    bytes[index++] = ((v5 << 7) | (v6 << 2) | (v7 >>> 3)) & 255;
    bytes[index++] = ((v7 << 5) | v8) & 255;
  }

  // remain bytes
  const remain = length - count;
  if (remain === 2) {
    v1 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v2 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    bytes[index++] = ((v1 << 3) | (v2 >>> 2)) & 255;
  } else if (remain === 4) {
    v1 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v2 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v3 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v4 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    bytes[index++] = ((v1 << 3) | (v2 >>> 2)) & 255;
    bytes[index++] = ((v2 << 6) | (v3 << 1) | (v4 >>> 4)) & 255;
  } else if (remain === 5) {
    v1 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v2 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v3 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v4 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v5 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    bytes[index++] = ((v1 << 3) | (v2 >>> 2)) & 255;
    bytes[index++] = ((v2 << 6) | (v3 << 1) | (v4 >>> 4)) & 255;
    bytes[index++] = ((v4 << 4) | (v5 >>> 1)) & 255;
  } else if (remain === 7) {
    v1 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v2 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v3 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v4 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v5 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v6 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    v7 = BASE32_DECODE_CHAR[base32Str.charAt(i++)];
    bytes[index++] = ((v1 << 3) | (v2 >>> 2)) & 255;
    bytes[index++] = ((v2 << 6) | (v3 << 1) | (v4 >>> 4)) & 255;
    bytes[index++] = ((v4 << 4) | (v5 >>> 1)) & 255;
    bytes[index++] = ((v5 << 7) | (v6 << 2) | (v7 >>> 3)) & 255;
  }
  return bytes;
};

export const encodeBytes = function (bytes: Uint8Array) {
  let v1;
  let v2;
  let v3;
  let v4;
  let v5;
  let base32Str = "";
  const length = bytes.length;
  for (
    var i = 0, count = parseInt((length / 5) as unknown as string) * 5;
    i < count;

  ) {
    v1 = bytes[i++];
    v2 = bytes[i++];
    v3 = bytes[i++];
    v4 = bytes[i++];
    v5 = bytes[i++];
    base32Str +=
      BASE32_ENCODE_CHAR[v1 >>> 3] +
      BASE32_ENCODE_CHAR[((v1 << 2) | (v2 >>> 6)) & 31] +
      BASE32_ENCODE_CHAR[(v2 >>> 1) & 31] +
      BASE32_ENCODE_CHAR[((v2 << 4) | (v3 >>> 4)) & 31] +
      BASE32_ENCODE_CHAR[((v3 << 1) | (v4 >>> 7)) & 31] +
      BASE32_ENCODE_CHAR[(v4 >>> 2) & 31] +
      BASE32_ENCODE_CHAR[((v4 << 3) | (v5 >>> 5)) & 31] +
      BASE32_ENCODE_CHAR[v5 & 31];
  }

  // remain char
  const remain = length - count;
  if (remain === 1) {
    v1 = bytes[i];
    base32Str +=
      BASE32_ENCODE_CHAR[v1 >>> 3] +
      BASE32_ENCODE_CHAR[(v1 << 2) & 31] +
      "======";
  } else if (remain === 2) {
    v1 = bytes[i++];
    v2 = bytes[i];
    base32Str +=
      BASE32_ENCODE_CHAR[v1 >>> 3] +
      BASE32_ENCODE_CHAR[((v1 << 2) | (v2 >>> 6)) & 31] +
      BASE32_ENCODE_CHAR[(v2 >>> 1) & 31] +
      BASE32_ENCODE_CHAR[(v2 << 4) & 31] +
      "====";
  } else if (remain === 3) {
    v1 = bytes[i++];
    v2 = bytes[i++];
    v3 = bytes[i];
    base32Str +=
      BASE32_ENCODE_CHAR[v1 >>> 3] +
      BASE32_ENCODE_CHAR[((v1 << 2) | (v2 >>> 6)) & 31] +
      BASE32_ENCODE_CHAR[(v2 >>> 1) & 31] +
      BASE32_ENCODE_CHAR[((v2 << 4) | (v3 >>> 4)) & 31] +
      BASE32_ENCODE_CHAR[(v3 << 1) & 31] +
      "===";
  } else if (remain === 4) {
    v1 = bytes[i++];
    v2 = bytes[i++];
    v3 = bytes[i++];
    v4 = bytes[i];
    base32Str +=
      BASE32_ENCODE_CHAR[v1 >>> 3] +
      BASE32_ENCODE_CHAR[((v1 << 2) | (v2 >>> 6)) & 31] +
      BASE32_ENCODE_CHAR[(v2 >>> 1) & 31] +
      BASE32_ENCODE_CHAR[((v2 << 4) | (v3 >>> 4)) & 31] +
      BASE32_ENCODE_CHAR[((v3 << 1) | (v4 >>> 7)) & 31] +
      BASE32_ENCODE_CHAR[(v4 >>> 2) & 31] +
      BASE32_ENCODE_CHAR[(v4 << 3) & 31] +
      "=";
  }
  return base32Str;
};
