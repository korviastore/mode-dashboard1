// netlify/functions/state.js
import { getStore } from '@netlify/blobs';

export async function handler(event) {
  // SADECE manuel yol: env yoksa asla getStore çağırma
  const siteID = process.env.BLOB_SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.BLOB_TOKEN    || process.env.NETLIFY_API_TOKEN;

  if (!siteID || !token) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Missing credentials',
        need: 'Set BLOB_TOKEN (secret) and BLOB_SITE_ID (Project ID) in Environment variables (Production).'
      })
    };
  }

  const store = getStore('mode-dashboard', { siteID, token });

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
