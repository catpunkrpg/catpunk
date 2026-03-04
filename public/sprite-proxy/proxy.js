/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  CatPunk HF Proxy — Node.js (no dependencies!)   ║
 * ║                                                   ║
 * ║  Setup:                                           ║
 * ║    1. node proxy.js                               ║
 * ║    2. Buka pixel-sprite-generator.html            ║
 * ║    3. Set Proxy URL: http://localhost:3001        ║
 * ╚═══════════════════════════════════════════════════╝
 *
 * Tidak butuh npm install apapun — pure Node.js built-in!
 * Requires Node.js v18+ (untuk fetch built-in)
 */

import http  from 'http';
import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { URL } from 'url';

// ── Config ────────────────────────────────────────────────────
const PORT = 3001;

// Load HF token dari .env file (kalau ada) atau env variable
let HF_TOKEN = process.env.HF_TOKEN || '';

if (!HF_TOKEN && existsSync('.env')) {
  const env = readFileSync('.env', 'utf8');
  const match = env.match(/^HF_TOKEN\s*=\s*(.+)$/m);
  if (match) HF_TOKEN = match[1].trim();
}

if (!HF_TOKEN) {
  console.error('\n❌  HF_TOKEN tidak ditemukan!');
  console.error('   Buat file .env dengan isi:');
  console.error('   HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx\n');
  process.exit(1);
}

console.log(`✅  HF Token: ${HF_TOKEN.slice(0,6)}…${HF_TOKEN.slice(-4)}`);

// ── CORS headers ──────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Helper: send JSON ─────────────────────────────────────────
function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS });
  res.end(body);
}

// ── Helper: forward POST to HF, pipe image back ───────────────
function forwardToHF(modelId, body, res) {
  const hfUrl = new URL(`https://api-inference.huggingface.co/models/${modelId}`);

  const options = {
    hostname: hfUrl.hostname,
    path:     hfUrl.pathname,
    method:   'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const req = https.request(options, (hfRes) => {
    const ct = hfRes.headers['content-type'] || '';

    // If HF returns an error (JSON), relay it
    if (!ct.includes('image')) {
      let raw = '';
      hfRes.on('data', d => raw += d);
      hfRes.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(raw); } catch {}

        const status = hfRes.statusCode || 502;
        console.error(`[HF] ${status} ${modelId}: ${raw.slice(0,120)}`);

        // Special messages
        if (status === 401) return sendJSON(res, 401, { error: 'Token HF tidak valid.' });
        if (status === 503) return sendJSON(res, 503, {
          error: 'Model sedang loading di HF, tunggu ~20 detik lalu coba lagi.',
          estimated_time: parsed.estimated_time,
        });

        sendJSON(res, status, { error: parsed.error || parsed.message || `HF error ${status}` });
      });
      return;
    }

    // Image response — pipe langsung ke client
    res.writeHead(200, {
      'Content-Type': ct,
      ...CORS,
    });
    hfRes.pipe(res);
  });

  req.on('error', err => {
    console.error('[Proxy error]', err.message);
    sendJSON(res, 502, { error: 'Proxy gagal connect ke HF: ' + err.message });
  });

  req.write(body);
  req.end();
}

// ── HTTP Server ───────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const ts  = new Date().toTimeString().slice(0,8);
  const url = new URL(req.url, `http://localhost:${PORT}`);

  console.log(`[${ts}] ${req.method} ${url.pathname}`);

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // Health check
  if (url.pathname === '/health' && req.method === 'GET') {
    sendJSON(res, 200, {
      status:  'ok',
      service: 'catpunk-hf-proxy',
      token:   HF_TOKEN.slice(0,6) + '…',
    });
    return;
  }

  // ── POST /api/generate/:modelId ──────────────────────────────
  // e.g. /api/generate/nerijs%2Fpixel-art-xl
  const genMatch = url.pathname.match(/^\/api\/generate\/(.+)$/);
  if (genMatch && req.method === 'POST') {
    const modelId = decodeURIComponent(genMatch[1]);

    let raw = '';
    req.on('data', d => raw += d);
    req.on('end', () => {
      // Validate & forward to HF
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { return sendJSON(res, 400, { error: 'Invalid JSON' }); }

      if (!parsed.inputs) return sendJSON(res, 400, { error: '"inputs" field wajib diisi' });

      // Build HF payload (strip custom fields, keep HF params)
      const hfPayload = JSON.stringify({
        inputs:     parsed.inputs,
        parameters: parsed.parameters || {},
        options:    { wait_for_model: true, use_cache: false, ...parsed.options },
      });

      console.log(`  → HF model: ${modelId}`);
      console.log(`  → prompt: "${parsed.inputs.slice(0,60)}…"`);

      forwardToHF(modelId, hfPayload, res);
    });
    return;
  }

  // 404
  sendJSON(res, 404, { error: 'Route not found', path: url.pathname });
});

server.listen(PORT, () => {
  console.log(`\n🚀  CatPunk HF Proxy`);
  console.log(`    http://localhost:${PORT}`);
  console.log(`    http://localhost:${PORT}/health\n`);
  console.log(`    Buka pixel-sprite-generator.html di browser`);
  console.log(`    Set Proxy URL: http://localhost:${PORT}\n`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} sudah dipakai!`);
    console.error(`   Ganti PORT di baris atas file ini.\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
