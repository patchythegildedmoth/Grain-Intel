/**
 * Cloudflare Worker — Yahoo Finance CORS Proxy + USDA NASS Proxy
 *
 * Routes:
 *  - Default (no pathname match): Yahoo Finance chart API proxy
 *    GET https://<worker>.workers.dev/?symbol=ZCK26.CBT
 *    GET https://<worker>.workers.dev/?symbol=ZC=F&period1=...&period2=...&interval=1d
 *
 *  - /usda-nass: USDA NASS QuickStats API proxy with key injection
 *    GET https://<worker>.workers.dev/usda-nass?commodity_desc=CORN&...
 *    The NASS API key is passed via the X-NASS-Api-Key request header (NOT a query param)
 *    so it never appears in Cloudflare request logs.
 *    Only accepts requests from allowed origins (prod + localhost dev).
 *
 * Deploy: cd worker/yahoo-proxy && npx wrangler deploy
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Origins allowed to call the NASS route (keeps the free API key from being abused
// by third parties who discover the worker URL).
const NASS_ALLOWED_ORIGINS = new Set([
  'https://patchythegildedmoth.github.io',
  'http://localhost:5173',
  'http://localhost:4173', // vite preview
  'http://localhost:3000',
]);

/** CORS headers for NASS route — echoes back the specific allowed origin. */
function nassCorHeaders(origin) {
  const allowed = NASS_ALLOWED_ORIGINS.has(origin) ? origin : null;
  return {
    'Access-Control-Allow-Origin': allowed ?? '',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-NASS-Api-Key',
    'Vary': 'Origin',
  };
}

// ─── USDA NASS handler ────────────────────────────────────────────────────────

async function handleNass(request) {
  const origin = request.headers.get('Origin') ?? '';
  const corsH = nassCorHeaders(origin);

  // Enforce origin allowlist
  if (!NASS_ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsH },
    });
  }

  // Read API key from header — never from URL params (avoids Cloudflare log exposure)
  const nassApiKey = request.headers.get('X-NASS-Api-Key');
  if (!nassApiKey) {
    return new Response(JSON.stringify({ error: 'Missing X-NASS-Api-Key header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsH },
    });
  }

  // Forward all query params to NASS (nassApiKey was never in the URL)
  const url = new URL(request.url);
  const upstreamParams = new URLSearchParams(url.searchParams);

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
      headers: { 'Content-Type': 'application/json', ...corsH },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'NASS upstream fetch failed', detail: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsH },
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
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') ?? '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const corsH = path === '/usda-nass' ? nassCorHeaders(origin) : CORS_HEADERS;
      return new Response(null, { headers: corsH });
    }

    if (path === '/usda-nass') {
      return handleNass(request);
    }

    return handleYahoo(request);
  },
};
