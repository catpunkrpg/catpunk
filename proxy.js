/**
 * CatPunk HF Proxy — pure Node.js, NO npm install needed!
 *
 * CARA PAKAI:
 *   1. Buat file .env di folder yang sama:
 *        HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxx
 *   2. node proxy.js
 *   3. Buka pixel-sprite-generator.html
 *      Set Proxy URL → http://localhost:3001
 *
 * Butuh Node.js v18+
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Load .env manual (no dotenv package needed) ───────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
}
loadEnv();

// ── Config ────────────────────────────────────────────────────
const PORT      = process.env.PORT || 3001;
const HF_TOKEN  = process.env.HF_TOKEN || '';

if (!HF_TOKEN || !HF_TOKEN.startsWith('hf_')) {
  console.error('\n❌  HF_TOKEN tidak ditemukan atau tidak valid!');
  console.error('   Buat file .env di folder ini dengan isi:');
  console.error('   HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx\n');
  console.error('   Dapatkan token GRATIS di:');
  console.error('   https://huggingface.co/settings/tokens\n');
  process.exit(1);
}

console.log('✅  HF Token:', HF_TOKEN.slice(0, 6) + '…' + HF_TOKEN.slice(-4));

// ── CORS headers ──────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Helpers ───────────────────────────────────────────────────
function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ── Forward ke HF, pipe image response ke client ──────────────
function forwardToHF(modelId, bodyStr, res) {
  const options = {
    hostname: 'router.huggingface.co',
    path:     `/hf-inference/models/${modelId}`,
    method:   'POST',
    headers: {
      'Authorization':  `Bearer ${HF_TOKEN}`,
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
  };

  const hfReq = https.request(options, (hfRes) => {
    const status = hfRes.statusCode;
    const ct     = hfRes.headers['content-type'] || '';

    // Image response → pipe langsung
    if (ct.startsWith('image/')) {
      res.writeHead(200, { 'Content-Type': ct, ...CORS });
      hfRes.pipe(res);
      return;
    }

    // Error/JSON response dari HF
    let raw = '';
    hfRes.on('data', d => raw += d);
    hfRes.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(raw); } catch {}

      console.error(`[HF] ${status} → ${raw.slice(0, 120)}`);

      if (status === 401) return sendJSON(res, 401, { error: 'Token HF tidak valid. Cek file .env' });
      if (status === 503) return sendJSON(res, 503, {
        error: 'Model sedang loading di HF, tunggu ~20 detik lalu generate ulang',
        estimated_time: parsed.estimated_time,
      });

      sendJSON(res, status || 502, {
        error: parsed.error || parsed.message || `HF error ${status}`,
      });
    });
  });

  hfReq.on('error', (err) => {
    console.error('[Proxy error]', err.message);
    sendJSON(res, 502, { error: 'Gagal konek ke HF: ' + err.message });
  });

  hfReq.write(bodyStr);
  hfReq.end();
}

// ── Server ────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const ts  = new Date().toTimeString().slice(0, 8);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  console.log(`[${ts}] ${req.method} ${url.pathname}`);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // GET /health
  if (url.pathname === '/health' && req.method === 'GET') {
    return sendJSON(res, 200, {
      status:  'ok',
      service: 'catpunk-hf-proxy',
      token:   HF_TOKEN.slice(0, 6) + '…',
    });
  }

  // POST /api/generate?model=nerijs/pixel-art-xl
  if (url.pathname === '/api/generate' && req.method === 'POST') {
    const modelId = url.searchParams.get('model') || 'nerijs/pixel-art-xl';

    let body;
    try {
      const raw = await readBody(req);
      body = JSON.parse(raw);
    } catch {
      return sendJSON(res, 400, { error: 'Invalid JSON body' });
    }

    if (!body.inputs) return sendJSON(res, 400, { error: '"inputs" wajib diisi' });

    const hfPayload = JSON.stringify({
      inputs:     body.inputs,
      parameters: body.parameters || {},
      options:    Object.assign({ wait_for_model: true, use_cache: false }, body.options),
    });

    console.log(`  → model: ${modelId}`);
    console.log(`  → prompt: "${body.inputs.slice(0, 70)}…"`);

    forwardToHF(modelId, hfPayload, res);
    return;
  }

  sendJSON(res, 404, { error: 'Not found', path: url.pathname });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} sudah dipakai!`);
    console.error(`   Stop proses lain atau ganti PORT=xxxx di .env\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n🚀  CatPunk HF Proxy berjalan!`);
  console.log(`    http://localhost:${PORT}`);
  console.log(`    http://localhost:${PORT}/health\n`);
  console.log(`    Buka pixel-sprite-generator.html`);
  console.log(`    Set Proxy URL → http://localhost:${PORT}\n`);
});