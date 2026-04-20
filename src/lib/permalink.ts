// Self-contained shareable links: #preset=<base64url(gzip(xml))>
// Useful as an export/import path and as a fallback when the KV-backed API is
// unavailable. Uses browser-native CompressionStream.

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export async function encodePermalink(xml: string): Promise<string> {
  const input = new Blob([xml]).stream();
  const compressed = input.pipeThrough(new CompressionStream('gzip'));
  const bytes = await streamToBytes(compressed);
  return b64urlEncode(bytes);
}

export async function decodePermalink(token: string): Promise<string> {
  const bytes = b64urlDecode(token);
  // Copy into a fresh ArrayBuffer to satisfy Blob's BlobPart type (avoid SharedArrayBuffer).
  const buf = new Uint8Array(bytes.length);
  buf.set(bytes);
  const input = new Blob([buf.buffer]).stream();
  const decompressed = input.pipeThrough(new DecompressionStream('gzip'));
  const out = await streamToBytes(decompressed);
  return new TextDecoder().decode(out);
}

export function parseHashPreset(hash: string): string | null {
  const m = /#preset=([A-Za-z0-9_-]+)/.exec(hash);
  return m ? m[1] : null;
}
