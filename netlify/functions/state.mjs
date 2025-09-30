import { getStore } from '@netlify/blobs';

// Bu fonksiyon, iki modda çalışır:
// 1) Projede Blobs aktifse: getStore('mode-dashboard') tek başına yeter.
// 2) Aktif değilse: NETLIFY_SITE_ID (Netlify'in verdiği hazır env) + BLOB_TOKEN/NETLIFY_API_TOKEN ile manuel çalışır.
export async function handler(event) {
  // Netlify her deploy'da otomatik sağlar:
  const siteID = process.env.BLOB_SITE_ID || process.env.NETLIFY_SITE_ID;
  // Gizli token'ı sen ekleyeceksin (Environment variables):
  const token  = process.env.BLOB_TOKEN || process.env.NETLIFY_API_TOKEN;

  // Eğer token varsa manuel client, yoksa otomatik (aktifse)
  const opts = (siteID && token) ? { siteID, token } : undefined;
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
