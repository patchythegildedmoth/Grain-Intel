/**
 * Cloudflare Worker — Yahoo Finance CORS Proxy + USDA NASS Proxy
 *
 * Routes:
 *  - Default (no pathname match): Yahoo Finance chart API proxy
 *    GET https://<worker>.workers.dev/?symbol=ZCK26.CBT
 *    GET https://<worker>.workers.dev/?symbol=ZC=F&period1=...&period2=...&interval=1d
 *
 *  - /usda-nass: USDA NASS QuickStats API proxy with key injection
 *    GET https://<worker>.workers.dev/usda-nass?nassApiKey=<key>&commodity_desc=CORN&...
 *    The worker strips nassApiKey from the forwarded request and injects it as &key=
 *    into the upstream NASS URL. Returns response verbatim + CORS headers.
 *
 * Deploy: cd worker/yahoo-proxy && npx wrangler deploy
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── USDA NASS handler ────────────────────────────────────────────────────────

async function handleNass(request) {
  const url = new URL(request.url);

  // Extract and remove the API key from client-facing params
  const nassApiKey = url.searchParams.get('nassApiKey');
  if (!nassApiKey) {
    return new Response(JSON.stringify({ error: 'Missing nassApiKey parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Build upstream params — everything except nassApiKey
  const upstreamParams = new URLSearchParams();
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== 'nassApiKey') upstreamParams.set(k, v);
  }

  // NASS always requires source_desc + sector_desc for QuickStats
  if (!upstreamParams.has('source_desc')) upstreamParams.set('source_desc', 'SURVEY');
  if (!upstreamParams.has('sector_desc')) upstreamParams.set('sector_desc', 'CROPS');

  const nassUrl =
    `https://quickstats.nass.usda.gov/api/api_GET/?key=${encodeURIComponent(nassApiKey)}` +
    `&${upstreamParams.toString()}`;

  try {
    const resp = await fetch(nassUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; grain-intel/1.0)' },
    });
    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'NASS upstream fetch failed', detail: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

// ─── Yahoo Finance handler ────────────────────────────────────────────────────

async function handleYahoo(request) {
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
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/usda-nass') {
      return handleNass(request);
    }

    return handleYahoo(request);
  },
};
