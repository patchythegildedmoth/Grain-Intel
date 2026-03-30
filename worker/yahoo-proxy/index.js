/**
 * Cloudflare Worker — Yahoo Finance CORS Proxy
 *
 * Forwards requests to Yahoo Finance's chart API and adds CORS headers
 * so the grain-intel SPA can fetch settlement prices from the browser.
 *
 * Deploy: cd worker/yahoo-proxy && npx wrangler deploy
 * Usage:  GET https://<worker>.workers.dev/?symbol=ZCK26.CBT
 *          GET https://<worker>.workers.dev/?symbol=ZC=F&period1=1640995200&period2=1703980800&interval=1d
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Missing ?symbol= parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    try {
      // Support historical queries with period1/period2 (unix timestamps)
      const period1 = url.searchParams.get('period1');
      const period2 = url.searchParams.get('period2');
      const interval = url.searchParams.get('interval') || '1d';

      let yahooUrl;
      if (period1 && period2) {
        yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}`;
      } else {
        yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      }
      const resp = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; grain-intel/1.0)' },
      });

      const body = await resp.text();
      return new Response(body, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream fetch failed', detail: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};
