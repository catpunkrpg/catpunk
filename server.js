const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');
const fs      = require('fs');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout:  5000,
});

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(__dirname));
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));

// ═════════════════════════════════════════════════════════════════════════════
//  MAP EDITOR API  (preserved from original server.js)
// ═════════════════════════════════════════════════════════════════════════════

let liveMap     = null;
let liveMapMeta = null;

// GET /api/current-map-name — game.html fetches this on startup
app.get('/api/current-map-name', (req, res) => {
  if (liveMapMeta) return res.json(liveMapMeta);
  const curFile = path.join(__dirname, 'assets', 'maps', '_current.txt');
  if (fs.existsSync(curFile)) {
    const name    = fs.readFileSync(curFile, 'utf8').trim();
    const webPath = 'assets/maps/' + name;
    liveMapMeta   = { path: webPath, filename: name, name: name.replace('.json', '') };
    return res.json(liveMapMeta);
  }
  res.json({ path: null }); // no map yet — game.html falls back to static map.js
});

// GET /api/map — returns live map pushed from map-editor
app.get('/api/map', (req, res) => {
  res.json(liveMap || { mapData: [] });
});

// POST /api/save-map — map-editor.html posts dungeon JSON here
app.post('/api/save-map', (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) return res.status(400).json({ ok: false, error: 'filename or data missing' });
  const dir = path.join(__dirname, 'assets', 'maps');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const fullPath = path.join(dir, safeName);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    fs.writeFileSync(path.join(dir, '_current.txt'), safeName, 'utf8');
    const webPath = 'assets/maps/' + safeName;
    liveMap     = data;
    liveMapMeta = { path: webPath, filename: safeName, name: data.name || safeName };
    io.emit('mapUpdate', {
      name: data.name, width: data.width, height: data.height,
      startX: data.startX, startY: data.startY, mapType: 'dungeon',
      path: webPath, filename: safeName,
    });
    console.log('[Map Editor] Saved:', fullPath);
    res.json({ ok: true, path: webPath });
  } catch (err) {
    console.error('[Map Editor] save-map error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/map — live map push from map-editor (flat mapData format)
app.post('/api/map', (req, res) => {
  const body = req.body;
  if (!body.mapData || !Array.isArray(body.mapData)) {
    return res.status(400).json({ ok: false, error: 'mapData missing' });
  }
  liveMap = body;
  const { name, width, height, startX, startY, mapType } = body;
  const mapFilename = (name || 'map').replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
  liveMapMeta = { path: '/api/map', filename: mapFilename, name: name || 'Custom Map' };
  console.log('[Map Editor] Map applied:', name, width + 'x' + height, '|', mapType || 'downtown');
  io.emit('mapUpdate', { name, width, height, startX, startY, mapType: mapType || 'downtown', path: '/api/map', filename: mapFilename });
  res.json({ ok: true });
});

// ═════════════════════════════════════════════════════════════════════════════
//  GAME CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

const TICK_RATE    = 20;   // server ticks per second
const PLAYER_SPEED = 2;    // pixel speed (legacy input handler)
const RUN_SPEED    = 4;
const TILE_SIZE    = 32;   // must match game.html TILE_SZ
const MAP_TILES    = 80;   // map size in tiles
const MAX_MONSTERS = 12;

// ═════════════════════════════════════════════════════════════════════════════
//  GAME STATE
// ═════════════════════════════════════════════════════════════════════════════

const players  = {};
const monsters = {};
let   monCtr   = 0;

// Monster roster — names match MONSTER_SPRITES in game.html for pixel-art fallback
const MON_TYPES = ['Cyber Bat', 'Data Dragon', 'Death Bot', 'Glitch Beast', 'Neon Wolf'];
const MON_HP    = { 'Cyber Bat': 60, 'Data Dragon': 250, 'Death Bot': 350, 'Glitch Beast': 180, 'Neon Wolf': 120 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randTile() {
  return {
    x: 8 + Math.floor(Math.random() * (MAP_TILES - 16)),
    y: 8 + Math.floor(Math.random() * (MAP_TILES - 16)),
  };
}

// Legacy pixel spawn (kept for backward compat with old 'attack' handler)
function getRandomSpawn() {
  return {
    x: 200 + Math.random() * 400,
    y: 200 + Math.random() * 400,
  };
}

function spawnMonster(existingId) {
  if (Object.keys(monsters).length >= MAX_MONSTERS && !existingId) return;
  const id   = existingId || ('mon_' + monCtr++);
  const type = MON_TYPES[Math.floor(Math.random() * MON_TYPES.length)];
  const pos  = randTile();
  monsters[id] = {
    id, type,
    typeIdx: MON_TYPES.indexOf(type),
    x: pos.x, y: pos.y,
    hp: MON_HP[type], maxHp: MON_HP[type],
    dir: 0, lastAttack: 0,
  };
}

function sanitisePlayer(p) {
  return {
    id: p.id, x: p.x, y: p.y,
    dir: p.dir ?? 0, frame: p.frame ?? 0,
    hp: p.hp, maxHp: p.maxHp,
    level: p.level, username: p.username,
    charId: p.charId,
    // keep 'character' for backward compat with old client code
    character: p.charId || p.character || 'warrior',
  };
}

function sanitiseAllPlayers(excludeId) {
  const out = {};
  for (const [id, p] of Object.entries(players)) {
    if (id !== excludeId) out[id] = sanitisePlayer(p);
  }
  return out;
}

// Pre-spawn initial monsters
for (let i = 0; i < 8; i++) spawnMonster();

// ═════════════════════════════════════════════════════════════════════════════
//  SOCKET.IO — CONNECTION HANDLING
// ═════════════════════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  const spawn = randTile();

  players[socket.id] = {
    id:         socket.id,
    x:          spawn.x,
    y:          spawn.y,
    dir:        0,
    frame:      0,
    hp:         100,
    maxHp:      100,
    shield:     50,
    maxShield:  50,
    level:      1,
    xp:         0,
    username:   'Player_' + socket.id.slice(0, 5),
    charId:     'warrior',
    character:  'warrior',   // legacy compat
    lastAttack: 0,
  };

  const p = players[socket.id];
  console.log(`[+] Connected: ${p.username} | ${socket.id} (${Object.keys(players).length} online)`);

  // ── Send init data to the new player ─────────────────────────────────────
  socket.emit('init', {
    id:       socket.id,
    player:   sanitisePlayer(p),
    players:  sanitiseAllPlayers(socket.id),  // existing players snapshot
    monsters: monsters,                        // existing monsters snapshot
  });

  // Notify all others
  socket.broadcast.emit('playerJoined', sanitisePlayer(p));
  io.emit('onlineCount', Object.keys(players).length);

  // ── setName — called after character select screen ────────────────────────
  // Receives: { username, charId, hp, shield }
  socket.on('setName', (data) => {
    const pl = players[socket.id];
    if (!pl) return;
    if (data.username) pl.username  = String(data.username).replace(/[<>"']/g, '').slice(0, 16);
    if (data.charId)   { pl.charId  = data.charId; pl.character = data.charId; }
    if (data.hp)       { pl.hp = data.hp; pl.maxHp = data.hp; }
    if (data.shield)   { pl.shield = data.shield; pl.maxShield = data.shield; }
    console.log(`[~] Named: "${pl.username}" (${pl.charId}) | ${socket.id}`);
    // Broadcast updated info to all players
    io.emit('playerUpdate', sanitisePlayer(pl));
  });

  // ── selectCharacter — legacy event from old client ────────────────────────
  socket.on('selectCharacter', (data) => {
    const pl = players[socket.id];
    if (!pl) return;
    pl.character = data.character || 'warrior';
    pl.charId    = pl.character;
  });

  // ── move — tile-based position update from game.html ─────────────────────
  socket.on('move', (data) => {
    const pl = players[socket.id];
    if (!pl) return;
    if (data.x !== undefined) pl.x = Math.max(0, Math.min(MAP_TILES - 1, Math.round(data.x)));
    if (data.y !== undefined) pl.y = Math.max(0, Math.min(MAP_TILES - 1, Math.round(data.y)));
    if (data.dir   !== undefined) pl.dir   = data.dir;
    if (data.frame !== undefined) pl.frame = data.frame;
    if (data.hp    !== undefined) pl.hp    = Math.max(0, Math.min(pl.maxHp, data.hp));
  });

  // ── input — legacy pixel-based movement (kept for backward compat) ────────
  socket.on('input', (data) => {
    const pl = players[socket.id];
    if (!pl) return;
    const speed = data.shift ? RUN_SPEED : PLAYER_SPEED;
    if (data.up)    pl.y -= speed;
    if (data.down)  pl.y += speed;
    if (data.left)  pl.x -= speed;
    if (data.right) pl.x += speed;
    pl.x = Math.max(0, Math.min(MAP_TILES - 1, pl.x));
    pl.y = Math.max(0, Math.min(MAP_TILES - 1, pl.y));
  });

  // ── attack — legacy combat event ──────────────────────────────────────────
  socket.on('attack', (data) => {
    const attacker = players[socket.id];
    if (!attacker) return;
    const now = Date.now();
    if (now - attacker.lastAttack < 500) return;
    attacker.lastAttack = now;
    const damage = 20 + (attacker.level * 2);
    const range  = 3; // tile range

    for (const id in monsters) {
      const mon  = monsters[id];
      const dist = Math.abs(attacker.x - mon.x) + Math.abs(attacker.y - mon.y);
      if (dist > range) continue;
      mon.hp -= damage;
      io.emit('monsterDamage', { monsterId: id, damage, hp: mon.hp });
      if (mon.hp <= 0) {
        attacker.xp += 30;
        const xpNeeded = attacker.level * 100;
        if (attacker.xp >= xpNeeded) {
          attacker.level++;
          attacker.xp -= xpNeeded;
          attacker.maxHp += 20;
          attacker.hp = attacker.maxHp;
          io.emit('playerLevelUp', { playerId: socket.id, level: attacker.level });
        }
        spawnMonster(id); // respawn same id
        io.emit('monsterKilled', { monsterId: id, killerId: socket.id, newMonster: monsters[id] });
      }
    }
  });

  // ── pvpAttack — player vs player ─────────────────────────────────────────
  socket.on('pvpAttack', (data) => {
    const atk = players[socket.id];
    const tgt = players[data.targetId];
    if (!atk || !tgt) return;
    const now = Date.now();
    if (now - atk.lastAttack < 300) return;
    atk.lastAttack = now;
    const dmg = Math.min(data.damage || 25, 600);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    io.to(data.targetId).emit('pvpHit', { targetId: data.targetId, damage: dmg, attackerName: atk.username });
    socket.emit('pvpHitConfirm', { targetId: data.targetId, damage: dmg, targetName: tgt.username });
    if (tgt.hp <= 0) {
      const s = randTile();
      tgt.hp = tgt.maxHp; tgt.x = s.x; tgt.y = s.y;
      io.emit('playerDeath', { playerId: data.targetId, killerId: socket.id });
      atk.xp += 50;
      socket.emit('pvpKill', { targetName: tgt.username, xp: 50 });
    }
  });

  // ── pvpKill — no-op (handled server-side above) ───────────────────────────
  socket.on('pvpKill', () => {});

  // ── chat ──────────────────────────────────────────────────────────────────
  socket.on('chat', (data) => {
    const pl = players[socket.id];
    if (!pl || !data.message) return;
    const msg = String(data.message).replace(/[<>"]/g, '').slice(0, 200);
    io.emit('chat', { username: pl.username, message: msg, playerId: socket.id });
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const pl   = players[socket.id];
    const name = pl ? pl.username : socket.id;
    delete players[socket.id];
    socket.broadcast.emit('playerLeft', socket.id);
    io.emit('onlineCount', Object.keys(players).length);
    console.log(`[-] Disconnected: ${name} (${Object.keys(players).length} online)`);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  GAME LOOP — Monster AI + State Broadcast  (20fps)
// ═════════════════════════════════════════════════════════════════════════════

setInterval(() => {
  const now = Date.now();

  // ── Monster AI ──────────────────────────────────────────────────────────
  for (const [mid, mon] of Object.entries(monsters)) {
    if (mon.hp <= 0) { spawnMonster(mid); continue; }

    // Find nearest player (tile Manhattan distance)
    let nearest = null, minDist = 9999;
    for (const pl of Object.values(players)) {
      if (pl.hp <= 0) continue;
      const d = Math.abs(pl.x - mon.x) + Math.abs(pl.y - mon.y);
      if (d < minDist) { minDist = d; nearest = pl; }
    }

    if (!nearest || minDist > 18) continue;

    // Move 1 tile toward player (~6-7 moves/sec at 20fps tick)
    if (Math.random() < 0.33) {
      const dx = nearest.x - mon.x;
      const dy = nearest.y - mon.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        mon.x += dx > 0 ? 1 : -1;
      } else {
        mon.y += dy > 0 ? 1 : -1;
      }
      mon.x = Math.max(1, Math.min(MAP_TILES - 2, mon.x));
      mon.y = Math.max(1, Math.min(MAP_TILES - 2, mon.y));
    }

    // Attack if adjacent (1.5 tile range)
    if (minDist <= 1.5 && now - mon.lastAttack > 1200) {
      mon.lastAttack = now;
      const dmg = Math.floor(5 + Math.random() * 10);
      nearest.hp = Math.max(0, nearest.hp - dmg);
      io.to(nearest.id).emit('monsterAttack', { monsterId: mid, damage: dmg, targetId: nearest.id });
      if (nearest.hp <= 0) {
        const s = randTile();
        nearest.hp = nearest.maxHp;
        nearest.x  = s.x;
        nearest.y  = s.y;
        io.emit('playerDeath', { playerId: nearest.id });
      }
    }
  }

  // Refill monsters if any died
  if (Object.keys(monsters).length < MAX_MONSTERS) spawnMonster();

  // ── Broadcast full state snapshot to all clients ──────────────────────────
  const playerSnapshot = {};
  for (const [id, p] of Object.entries(players)) {
    playerSnapshot[id] = sanitisePlayer(p);
  }
  io.emit('state', { players: playerSnapshot, monsters });

}, 1000 / TICK_RATE);

// ═════════════════════════════════════════════════════════════════════════════
//  START SERVER
// ═════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('   🎮  CAT PUNK — ONLINE MMORPG SERVER');
  console.log('═══════════════════════════════════════════');
  console.log(`   🌐  http://localhost:${PORT}`);
  console.log(`   🎯  http://localhost:${PORT}/game.html`);
  console.log(`   🏠  http://localhost:${PORT}/index.html`);
  console.log(`   🗺️   http://localhost:${PORT}/map-editor.html`);
  console.log('═══════════════════════════════════════════');
  console.log('');
});