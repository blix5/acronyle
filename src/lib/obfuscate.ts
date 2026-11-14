// Keeps the answer out of plain sight in the network tab. Not encryption:
// a determined player can decode it, which is an accepted trade-off.

function keyBytes(date: string): Uint8Array {
  return new TextEncoder().encode(`acronyle:${date}:shh`);
}

function xor(data: Uint8Array, key: Uint8Array): Uint8Array {
  return data.map((b, i) => b ^ key[i % key.length]);
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function encodeAnswer(phrase: string, date: string): string {
  return toBase64(xor(new TextEncoder().encode(phrase), keyBytes(date)));
}

export function decodeAnswer(encoded: string, date: string): string {
  return new TextDecoder().decode(xor(fromBase64(encoded), keyBytes(date)));
}
