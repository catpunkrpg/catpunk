// ═══════════════════════════════════════════════════════════════════════════
//  game.js  ·  CatPunk v2 — Multi-Level Map Integration
//  PATCH dari versi lama. Bagian yang berubah diberi komentar // [CHANGED]
//  Bagian lama yang di-HAPUS diberi komentar  // [REMOVED]
// ═══════════════════════════════════════════════════════════════════════════

// [FIX Bug #2] Graceful socket.io fallback — if server not available, use a
// no-op stub so game.js doesn't crash in standalone / game.html mode.
const socket = (typeof io === 'function') ? io() : {
  emit: () => {},
  on:   () => {},
};

// [FIX Bug #1] Canvas ID in game.html is 'gc', not 'game'.
// Try 'gc' first (game.html), then 'game' (legacy / custom HTML).
const canvas = document.getElementById("gc") || document.getElementById("game");
const ctx    = canvas ? canvas.getContext("2d") : null;

const TILE_SIZE = 32;

let myId    = null;
let players = {};
let monsters= {};
let ground  = [];
let objects = [];
let damageTexts = {};

// ─── Sprite Config ────────────────────────────────────────────────────────────
const SPRITE_BASE  = "/assets/player/cat-punk-warrior";
const SPRITE_DIRS  = ["south","north","west","east"];
const FRAME_COUNT  = 4;
const SPRITE_SIZE  = 56;
const FRAME_SPEED  = 8;
const DIR_NAME     = { 0:"south", 1:"north", 2:"west", 3:"east" };

// ─── Preload Sprites ──────────────────────────────────────────────────────────
const sprites = {};
let spritesLoaded = 0;
const spritesTotal = SPRITE_DIRS.length * FRAME_COUNT;

function preloadSprites(onReady) {
  for (const dir of SPRITE_DIRS) {
    sprites[dir] = [];
    for (let f = 0; f < FRAME_COUNT; f++) {
      const img = new Image();
      img.src = `${SPRITE_BASE}/${dir}/frame_${String(f).padStart(3,"0")}.png`;
      img.onload  = () => { if (++spritesLoaded >= spritesTotal) onReady(); };
      img.onerror = () => { if (++spritesLoaded >= spritesTotal) onReady(); };
      sprites[dir][f] = img;
    }
  }
}

// ─── Animation State ──────────────────────────────────────────────────────────
const animState = {};

function getAnim(id) {
  if (!animState[id]) animState[id] = { dir:0, frame:0, frameTick:0, prevX:null, prevY:null };
  return animState[id];
}

function updateAnim(id, x, y) {
  const a = getAnim(id);
  const moving = a.prevX !== null && (Math.abs(x - a.prevX) > 0.5 || Math.abs(y - a.prevY) > 0.5);
  if (a.prevX !== null) {
    const dx = x - a.prevX, dy = y - a.prevY;
    if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 3 : 2;
    else if (Math.abs(dy) > 0.5)    a.dir = dy > 0 ? 0 : 1;
  }
  if (moving) { if (++a.frameTick >= FRAME_SPEED) { a.frameTick=0; a.frame=(a.frame+1)%FRAME_COUNT; } }
  else { a.frame=0; a.frameTick=0; }
  a.prevX = x; a.prevY = y;
}

// ─── Draw Player ──────────────────────────────────────────────────────────────
function drawPlayer(p, id) {
  updateAnim(id, p.x, p.y);
  const a   = animState[id];
  const img = sprites[DIR_NAME[a.dir]]?.[a.frame];
  const dx  = p.x - SPRITE_SIZE / 2;
  const dy  = p.y - SPRITE_SIZE / 2;

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, dx, dy, SPRITE_SIZE, SPRITE_SIZE);
    if (id !== myId) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgba(255,80,80,0.5)";
      ctx.fillRect(dx, dy, SPRITE_SIZE, SPRITE_SIZE);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = id === myId ? "#00ff88" : "#ff2e63";
    ctx.fillRect(p.x - 16, p.y - 16, 32, 32);
  }

  const barY = p.y - SPRITE_SIZE / 2 - 10;
  ctx.fillStyle = "#600"; ctx.fillRect(p.x - 20, barY, 40, 5);
  ctx.fillStyle = "#0f0"; ctx.fillRect(p.x - 20, barY, 40 * Math.min(1, p.hp / p.maxHp), 5);
  ctx.fillStyle = "white"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center";
  ctx.fillText("Lv." + p.level, p.x, barY - 3); ctx.textAlign = "left";

  if (damageTexts[id]) {
    damageTexts[id] = damageTexts[id].filter((d) => {
      ctx.save(); ctx.globalAlpha = d.life / 40;
      ctx.fillStyle = "yellow"; ctx.font = "bold 13px Arial"; ctx.textAlign = "center";
      ctx.fillText("-" + d.value, p.x, p.y - SPRITE_SIZE / 2 - 15 - (40 - d.life));
      ctx.restore(); ctx.textAlign = "left"; d.life--;
      return d.life > 0;
    });
  }
}

// ─── Draw Monster ─────────────────────────────────────────────────────────────
// NOTE: When running inside game.html, this function is NEVER called —
// game.html owns the render loop and uses drawMonsters() / drawServerMonsters()
// which both use MONSTER_SPRITES + monsterImgs with full sprite support.
// This fallback is only used in standalone game.js mode (no game.html).
const MONSTER_COLORS = {
  bat:    { body:"#6a0dad", eye:"#ff0" }, wolf:  { body:"#555",    eye:"#0ff" },
  beast:  { body:"#8b4513", eye:"#f00" }, dragon:{ body:"#006400", eye:"#ff0" },
  bot:    { body:"#334466", eye:"#0ff" }, demon: { body:"#8b0000", eye:"#f80" },
};

function drawMonster(m) {
  // If game.html sprite system is available, delegate to it
  if (typeof monsterImgs !== 'undefined' && typeof MONSTER_SPRITES !== 'undefined') {
    // Build a minimal entry in serverMonsters and use drawServerMonsters logic
    // by calling the sprite draw directly
    const typeIdx = (m.typeIdx != null)
      ? m.typeIdx
      : (typeof getServerMonsterTypeIdx === 'function' ? getServerMonsterTypeIdx(m.type) : 0);
    const md       = MONSTER_SPRITES[typeIdx] || MONSTER_SPRITES[0];
    const imgs     = monsterImgs[typeIdx]     || monsterImgs[0];
    const frameArr = (imgs && imgs.idle) || [];
    const frameImg = frameArr[0];

    const drawW = TILE_SIZE * 1.5;
    const drawH = TILE_SIZE * 1.8;
    const destX = m.x - drawW / 2;
    const destY = m.y + TILE_SIZE / 2 - drawH;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y + TILE_SIZE / 2, TILE_SIZE * 0.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
      ctx.drawImage(frameImg, destX, destY, drawW, drawH);
    } else {
      ctx.fillStyle = (md && md.color) || '#888';
      ctx.fillRect(m.x - 14, m.y - 14, 28, 28);
    }

    // HP bar
    const barY = destY - 6;
    ctx.fillStyle = '#600'; ctx.fillRect(m.x - 20, barY, 40, 4);
    ctx.fillStyle = '#f00'; ctx.fillRect(m.x - 20, barY, 40 * Math.min(1, m.hp / m.maxHp), 4);

    // Name
    const label = m.name || (md && md.name) || m.type || '???';
    ctx.fillStyle = (md && md.color) || '#ffa0a0';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 3;
    ctx.font = '5px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText(label, m.x, destY - 8);
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
    ctx.restore();
    return;
  }

  // Pure fallback — no sprite data available (standalone minimal mode)
  const col = MONSTER_COLORS[m.type] || { body:"#555", eye:"#fff" };
  const cx = m.x, cy = m.y;
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col.body; ctx.fillRect(cx - 14, cy - 14, 28, 28);
  ctx.fillStyle = col.eye; ctx.shadowColor = col.eye; ctx.shadowBlur = 6;
  ctx.fillRect(cx - 8, cy - 5, 5, 5); ctx.fillRect(cx + 3, cy - 5, 5, 5);
  ctx.shadowBlur = 0;
  const barY = cy - 22;
  ctx.fillStyle = "#600"; ctx.fillRect(cx - 20, barY, 40, 4);
  ctx.fillStyle = "#f00"; ctx.fillRect(cx - 20, barY, 40 * Math.min(1, m.hp / m.maxHp), 4);
  ctx.fillStyle = "#ffa0a0"; ctx.font = "9px Arial"; ctx.textAlign = "center";
  ctx.fillText(m.type, cx, barY - 2); ctx.textAlign = "left";
}

// ═══════════════════════════════════════════════════════════════════════════
//  [CHANGED] Multi-Level Dungeon Map System
//  Semua kode dungeonGround / dungeonObjects lama DIGANTI dengan ini
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
//  [CHANGED] Multi-Level Dungeon Map System
// ═══════════════════════════════════════════════════════════════════════════

// [FIX Bug #3] game.html already creates its own dungeon/stairMgr instances.
// If game.html is present (detected via startGame or window.dungeon),
// re-use those instances instead of creating duplicates.
let dungeon, stairMgr;
if (typeof window !== 'undefined' && window.dungeon instanceof DungeonMap) {
  // game.html already owns the dungeon — reuse
  dungeon   = window.dungeon;
  stairMgr  = window.stairMgr || new StairManager(dungeon);
} else {
  dungeon   = new DungeonMap();
  stairMgr  = new StairManager(dungeon);
  if (typeof window !== 'undefined') {
    window.dungeon  = dungeon;
    window.stairMgr = stairMgr;
  }
}

// Stair cooldown (prevents spam trigger)
let stairCooldown = 0;

/**
 * [CHANGED] Load dungeon JSON — sekarang support multi-floor.
 * [FIX Bug #5] addSampleStairs dipanggil di .then() bukan setTimeout,
 * to avoid race condition with JSON loading.
 */
function loadDungeonJSON(url) {
  dungeon.loadJSON(url)
    .then(() => {
      console.log(`[Dungeon] Loaded ${dungeon.floors.length} floor(s)`);
      addSampleStairs(); // [FIX Bug #5] always called AFTER JSON is parsed
    })
    .catch(err => {
      console.warn("[Dungeon] Load failed:", err);
      addSampleStairs(); // also add stairs on failure (demo mode)
    });
}

/**
 * [CHANGED] Add sample stairs manually (for testing).
 * In production, stairs are stored in the JSON file.
 */
function addSampleStairs() {
  // Ensure at least 2 floors for testing
  if (dungeon.floors.length < 2) {
    // Clone floor 0 sebagai floor 1 (demo)
    dungeon.addFloor(dungeon.floors[0]?.width || 32, dungeon.floors[0]?.height || 32);
    dungeon.floors[1].name = "Floor 2 — Underground";
  }

  const f0 = dungeon.floors[0];
  const f1 = dungeon.floors[1];

  // Tangga naik di floor 0 → menuju floor 1
  f0.addStair('up', 15, 8, 1, 16, 9);

  // Tangga turun di floor 1 → kembali ke floor 0
  f1.addStair('down', 16, 9, 0, 15, 8);
}

// ─── Draw Map (CHANGED) ───────────────────────────────────────────────────────
// [FIX Bug #6] Pass translated=true because draw() already did ctx.translate(-camX,-camY)
function drawMap(camX, camY) {
  dungeon.render(ctx, camX, camY, canvas.width, canvas.height, performance.now(), true);
}

// ─── Stair Check per Frame (CHANGED) ─────────────────────────────────────────
function checkStairs(me) {
  if (Date.now() < stairCooldown) return;
  const stair = stairMgr.check(me.x, me.y);
  if (!stair) return;

  // Trigger transition
  stairMgr.traverse(stair, (newPx, newPy, newFloor) => {
    // Kirim posisi baru ke server
    socket.emit('teleport', { x: newPx, y: newPy, floor: newFloor });
    console.log(`[Dungeon] Moved to floor ${newFloor + 1}`);
  });

  // 2-second cooldown to prevent spam
  stairCooldown = Date.now() + 2000;
}

// ─── Main Draw Loop (CHANGED) ─────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!players[myId]) { requestAnimationFrame(draw); return; }

  const me   = players[myId];
  const camX = me.x - canvas.width  / 2;
  const camY = me.y - canvas.height / 2;

  ctx.save();
  ctx.translate(-camX, -camY);

  // [CHANGED] Render multi-level dungeon dengan animasi
  drawMap(camX, camY);

  for (const id in monsters) drawMonster(monsters[id]);
  for (const id in players)  drawPlayer(players[id], id);

  ctx.restore();

  // ── HUD ───────────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(20, 20, 220, 75);
  ctx.fillStyle = "white"; ctx.font = "bold 12px Arial";
  ctx.fillText("LEVEL " + me.level, 30, 38);
  ctx.fillStyle = "#333"; ctx.fillRect(30, 44, 180, 10);
  ctx.fillStyle = "#00ff88"; ctx.fillRect(30, 44, 180 * Math.min(1, me.hp / me.maxHp), 10);
  ctx.fillStyle = "white"; ctx.font = "9px Arial";
  ctx.fillText(`HP: ${me.hp}/${me.maxHp}`, 33, 52);
  ctx.fillStyle = "#222"; ctx.fillRect(30, 60, 180, 8);
  ctx.fillStyle = "#8b5cf6"; ctx.fillRect(30, 60, 180 * Math.min(1, me.xp / (me.level * 100)), 8);
  ctx.fillStyle = "white"; ctx.font = "9px Arial";
  ctx.fillText(`XP: ${me.xp}/${me.level * 100}`, 33, 68);

  // Online counter
  const pCount = Object.keys(players).length;
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(canvas.width - 110, 20, 95, 22);
  ctx.fillStyle = "#0f0"; ctx.font = "11px Arial";
  ctx.fillText(`● ${pCount} online`, canvas.width - 105, 35);

  // [CHANGED] Floor HUD (pojok kanan bawah)
  drawFloorHUD(ctx, dungeon, canvas.width, canvas.height);

  // [CHANGED] Check stairs every frame
  checkStairs(me);

  requestAnimationFrame(draw);
}

// ─── Socket Events ────────────────────────────────────────────────────────────
socket.on("init", (data) => { myId = data.id; });

socket.on("state", (state) => {
  ground  = state.ground;
  objects = state.objects;
  monsters = state.monsters || {};
  const newPlayers = state.players;
  for (const id in newPlayers) {
    if (players[id] && players[id].hp > newPlayers[id].hp) {
      if (!damageTexts[id]) damageTexts[id] = [];
      damageTexts[id].push({ value: players[id].hp - newPlayers[id].hp, life: 40 });
    }
  }
  players = newPlayers;
});

// ─── Input ────────────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp"    || e.code === "KeyW") socket.emit("input", { up:    true });
  if (e.code === "ArrowDown"  || e.code === "KeyS") socket.emit("input", { down:  true });
  if (e.code === "ArrowLeft"  || e.code === "KeyA") socket.emit("input", { left:  true });
  if (e.code === "ArrowRight" || e.code === "KeyD") socket.emit("input", { right: true });
  if (e.code === "Space") socket.emit("attack");
});
document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowUp"    || e.code === "KeyW") socket.emit("input", { up:    false });
  if (e.code === "ArrowDown"  || e.code === "KeyS") socket.emit("input", { down:  false });
  if (e.code === "ArrowLeft"  || e.code === "KeyA") socket.emit("input", { left:  false });
  if (e.code === "ArrowRight" || e.code === "KeyD") socket.emit("input", { right: false });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
// [FIX Bug #3] Only start game.js's own render loop if game.html is NOT present.
// game.html has its own render() + tileset loading + sprite preload.
// Running both causes double rendering and conflicting DungeonMap state.
if (ctx && typeof startGame === 'undefined') {
  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.textAlign = "center";
  ctx.fillText("Loading...", canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "left";

  // [FIX Bug #5] addSampleStairs now called inside loadDungeonJSON .then()
  loadDungeonJSON("/assets/maps/Dungeon_2026-02-21.json");

  preloadSprites(() => draw());
} else if (!ctx) {
  console.error("[game.js] Canvas element not found. Expected id='gc' or id='game'.");
}
// If startGame IS defined (game.html context), game.js only provides
// socket multiplayer handlers — game.html owns the render loop.