// netlify/functions/state.mjs
import { getStore } from '@netlify/blobs';

/**
 * Basit JSON state storage:
 * GET  -> mevcut state'i döner
 * POST -> body'deki state'i kaydeder (tamamını yazar)
 *
 * Kaydetme anahtarı: "mode-dashboard/state"
 */
export async function handler(event, context) {
  const store = getStore('mode-dashboard'); // site-scoped store

  // CORS/same-site: Netlify kendi domaininde çağırıyoruz; headerlar sade.
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
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(value || {})
      };
    } catch (e) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{}' };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      // Basit güvenlik: çok büyük payload engelle
      const payload = JSON.stringify(body);
      if (payload.length > 1_000_000) {
        return { statusCode: 413, body: 'Payload too large' };
      }
      await store.setJSON('state', body);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{"ok":true}' };
    } catch (e) {
      return { statusCode: 400, body: 'Invalid JSON' };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
}
