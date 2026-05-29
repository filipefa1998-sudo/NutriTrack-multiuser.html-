// NutriTrack AI Proxy — Cloudflare Worker
// Forwards requests to the Anthropic API, keeping your API key server-side
// so the AI Coach, AI food search, and AI Photo Analysis work on a public web deploy.
//
// SETUP (one time):
//   1. Create a free Cloudflare account → Workers & Pages → Create Worker.
//   2. Replace the worker code with this file and Deploy.
//   3. Settings → Variables and Secrets → add a Secret named ANTHROPIC_API_KEY
//      with your real key (get one at console.anthropic.com). Re-deploy.
//   4. Put your deployed Worker URL into the ALLOWED_ORIGINS list below AND into
//      AI_PROXY_URL at the top of NutriTrack's index.html.
//
// The ALLOWED_ORIGINS check stops strangers who find the URL from spending your quota.

const ALLOWED_ORIGINS = [
  'https://filipefa1998-sudo.github.io', // your GitHub Pages origin
  // 'http://localhost:8000',            // uncomment for local testing
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST')   return new Response('POST only', { status: 405, headers: cors });
    if (!allowed)                    return new Response('Forbidden origin', { status: 403, headers: cors });

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: await request.text(),
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
