// netlify/functions/state.mjs
import { getStore } from '@netlify/blobs';

/**
 * Çalışma mantığı:
 * - Projede Blobs aktifse: getStore('mode-dashboard') tek başına çalışır.
 * - Aktif değilse: NETLIFY_SITE_ID (Netlify'in verdiği hazır env) + BLOB_TOKEN/NETLIFY_API_TOKEN
 *   ya da elle eklediğimiz BLOB_SITE_ID + BLOB_TOKEN ile manuel çalışır.
 */
export async function handler(event) {
  // Env: Netlify hazır değişkeni + elle verdiğimiz fallback
  const siteID =
    process.env.BLOB_SITE_ID ||
    process.env.NETLIFY_SITE_ID; // Netlify otomatik sağlıyor (bazı bağlamlarda olmayabiliyor)

  const token =
    process.env.BLOB_TOKEN ||
    process.env.NETLIFY_API_TOKEN; // senin eklediğin gizli token

  // Eğer siteID + token varsa elle client; yoksa otomatik (Blobs UI açık ise)
  const opts = (siteID && token) ? { siteID, token } : undefined;

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // Hiçbir yol yoksa (ne UI’de Blobs var ne token verdik) net bir teşhis dön.
  if (!opts && !process.env.NETLIFY_BLOBS_CONTEXT) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Blobs not configured',
        need: 'Add BLOB_TOKEN (secret) and BLOB_SITE_ID (Project ID) env vars OR create a Blobs database.'
      })
    };
  }

  const store = getStore('mode-dashboard', opts);

  if (event.httpMethod === 'GET') {
    const value = await store.get('state', { type: 'json' }).catch(() => null);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(value || {})
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body || '{}');
      const payload = JSON.stringify(data);
      if (payload.length > 1_000_000) return { statusCode: 413, body: 'Payload too large' };
      await store.setJSON('state', data);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: '{"ok":true}'
      };
    } catch {
      return { statusCode: 400, body: 'Invalid JSON' };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
}
