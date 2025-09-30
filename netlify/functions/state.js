// netlify/functions/state.js
import { getStore } from '@netlify/blobs';

export async function handler(event) {
  // 1) ENV'leri oku
  const rawSiteId =
    process.env.BLOB_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    '';

  const rawToken =
    process.env.BLOB_TOKEN ||
    process.env.NETLIFY_API_TOKEN ||
    '';

  // Trim — bazen değerin başında/sonunda boşluk olabiliyor
  const siteID = rawSiteId.trim();
  const token  = rawToken.trim();

  // 2) DEBUG (değerleri asla göstermiyoruz)
  try {
    console.log(
      'STATE_FN DEBUG → HAS_SITE:', !!siteID,
      'HAS_TOKEN:', !!token,
      'ENV_KEYS:', Object.keys(process.env)
        .filter(k =>
          k === 'BLOB_SITE_ID' ||
          k === 'BLOB_TOKEN' ||
          k === 'NETLIFY_SITE_ID' ||
          k === 'NETLIFY_API_TOKEN'
        )
    );
  } catch {}

  // 3) CORS
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

  // 4) Kimlik yoksa kibar hata
  if (!siteID || !token) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Missing credentials',
        need: 'Set BLOB_TOKEN (or NETLIFY_API_TOKEN) and BLOB_SITE_ID (or NETLIFY_SITE_ID).'
      })
    };
  }

  // 5) ÖNEMLİ: Bazı sürümler siteId bekliyor, bazıları siteID.
  //    İkisini birden gönderiyoruz.
  const opts = { siteID, siteId: siteID, token };

  let store;
  try {
    store = getStore('mode-dashboard', opts);
  } catch (e) {
    console.log('STATE_FN DEBUG → getStore failed:', e?.message || e);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'getStore failed' })
    };
  }

  if (event.httpMethod === 'GET') {
    try {
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
    } catch (err) {
      console.log('STATE_FN DEBUG → GET error:', err?.message || err);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'GET failed' })
      };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body || '{}');
      const payload = JSON.stringify(data);
      if (payload.length > 1_000_000) {
        return { statusCode: 413, body: 'Payload too large' };
      }
      await store.setJSON('state', data);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: '{"ok":true}'
      };
    } catch (err) {
      console.log('STATE_FN DEBUG → POST error:', err?.message || err);
      return { statusCode: 400, body: 'Invalid JSON' };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
}
