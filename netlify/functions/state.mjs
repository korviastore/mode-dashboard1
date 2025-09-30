import { getStore } from '@netlify/blobs';

/**
 * Çalışma mantığı:
 * - Eğer projede Blobs aktifse: getStore('mode-dashboard') tek başına çalışır.
 * - Aktif değilse: NETLIFY_SITE_ID (Netlify'in verdiği hazır env) + BLOB_TOKEN/NETLIFY_API_TOKEN ile manuel çalışır.
 *   Bu sayede "MissingBlobsEnvironmentError" ortadan kalkar.
 */
export async function handler(event) {
  const siteID = process.env.BLOB_SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.BLOB_TOKEN    || process.env.NETLIFY_API_TOKEN;

  const opts = (siteID && token) ? { siteID, token } : undefined;

  // Debug için ilk çağrıda kolay teşhis (yayına uygun)
  if (!opts && !process.env.NETLIFY_BLOBS_CONTEXT) {
    // Bu durumda projede Blobs store’u oluşturulmamış ve token da verilmemiş demektir.
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Blobs not configured',
        hint: 'Add a BLOB_TOKEN (or NETLIFY_API_TOKEN) env var OR create a Blobs database in Netlify.',
        hasNetlifySiteId: Boolean(process.env.NETLIFY_SITE_ID)
      })
    };
  }

  const store = getStore('mode-dashboard', opts);

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

  if (event.httpMethod === 'GET') {
    try {
      const value = await store.get('state', { type: 'json' });
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(value || {})
      };
    } catch (e) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: '{}'
      };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const payload = JSON.stringify(body);
      if (payload.length > 1_000_000) {
        return { statusCode: 413, body: 'Payload too large' };
      }
      await store.setJSON('state', body);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: '{"ok":true}'
      };
    } catch (e) {
      return { statusCode: 400, body: 'Invalid JSON' };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
}
