// GET /josm-preset?data=<base64url(gzip(xml))>&name=<optional>
//
// Stateless URL-to-XML transformer. The entire preset XML is carried in the
// query string as gzip-compressed, base64url-encoded bytes. This function
// decodes it and returns the raw XML with the right Content-Type so JOSM
// can load it directly via Preferences → Tagging Presets → + → URL.
//
// No storage, no authentication, no KV binding. Pure function of its input.

const MAX_DATA_CHARS = 32_000; // ~24 KB compressed, ~hundreds of KB uncompressed

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gunzipToString(bytes: Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer so Blob() is happy (avoid SharedArrayBuffer typing).
  const buf = new Uint8Array(bytes.length);
  buf.set(bytes);
  const stream = new Blob([buf.buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(merged);
}

function err(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const data = url.searchParams.get('data');
  const name = url.searchParams.get('name') ?? 'preset';

  if (!data) return err(400, 'missing ?data=');
  if (data.length > MAX_DATA_CHARS) return err(413, `data too large (${data.length} chars)`);
  if (!/^[A-Za-z0-9_-]+$/.test(data)) return err(400, 'data must be base64url');

  let xml: string;
  try {
    const bytes = b64urlDecode(data);
    xml = await gunzipToString(bytes);
  } catch (e) {
    return err(400, `decode failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Minimal sanity check so we don't serve arbitrary payloads as XML.
  if (!xml.includes('<presets')) {
    return err(400, 'decoded payload is not a JOSM preset XML');
  }

  const safeName = name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'preset';

  return new Response(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // The data is in the URL itself, so the same URL always produces the
      // same response — long cache is safe.
      'cache-control': 'public, max-age=31536000, immutable',
      'content-disposition': `inline; filename="${safeName}.xml"`,
      'access-control-allow-origin': '*',
    },
  });
};

export const onRequestOptions: PagesFunction = () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-max-age': '86400',
    },
  });
