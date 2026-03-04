// ═══════════════════════════════════════════════════════════════════════════
//  map-system.js  ·  CatPunk Dungeon — Multi-Level Animated Map Engine
//  v3.0 — Fixed rendering, works directly with {tileset, idx} format
// ═══════════════════════════════════════════════════════════════════════════
"use strict";

const TILE_SRC = 16;   // tileset source px per tile
const TILE_DST = 32;   // screen px per tile

// ─── Animated Tile Registry ───────────────────────────────────────────────────
const ANIMATED_TILES = new Map([
  [50, { frames:[50,51,52,53], speed:250, cat:'water' }],
  [51, { frames:[50,51,52,53], speed:250, cat:'water' }],
  [52, { frames:[50,51,52,53], speed:250, cat:'water' }],
  [53, { frames:[50,51,52,53], speed:250, cat:'water' }],
  [32, { frames:[32,33,34,33], speed:350, cat:'water' }],
  [33, { frames:[32,33,34,33], speed:350, cat:'water' }],
  [34, { frames:[32,33,34,33], speed:350, cat:'water' }],
  [200,{ frames:[200,201,202,203], speed:120, cat:'lava' }],
  [201,{ frames:[200,201,202,203], speed:120, cat:'lava' }],
  [202,{ frames:[200,201,202,203], speed:120, cat:'lava' }],
  [203,{ frames:[200,201,202,203], speed:120, cat:'lava' }],
  [177,{ frames:[177,178,177,179], speed:100, cat:'obj' }],
  [178,{ frames:[177,178,177,179], speed:100, cat:'obj' }],
]);

// ─── Animation Clock ──────────────────────────────────────────────────────────
const animClock = {
  _now: 0, _clocks: new Map(),
  tick(now) { this._now = now; },
  frame(anim) {
    const key = anim.frames[0];
    if (!this._clocks.has(key)) this._clocks.set(key, { f:0, next: this._now + anim.speed });
    const c = this._clocks.get(key);
    if (this._now >= c.next) { c.f = (c.f+1) % anim.frames.length; c.next = this._now + anim.speed; }
    return anim.frames[c.f];
  }
};

// ─── DungeonMap ───────────────────────────────────────────────────────────────
class DungeonMap {
  constructor() {
    this.floors      = [];
    this.activeFloor = 0;
    this._imgs       = {};    // tileset name → HTMLImageElement
    this._transition = null;
  }

  loadJSON(url) {
    return fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => this._parse(data));
  }

  _parse(data) {
    this.floors = [];

    if (Array.isArray(data.floors) && data.floors.length > 0) {
      // v2 format
      this.floors = data.floors.map(f => ({
        name:       f.name || ('Floor ' + ((f.floorNum||0) + 1)),
        width:      f.width  || data.width  || 32,
        height:     f.height || data.height || 32,
        ground:     f.ground  || {},
        objects:    f.objects || {},
        roof:       f.roof    || {},
        stairsUp:   f.stairsUp   || [],
        stairsDown: f.stairsDown || [],
        solidTiles: f.solidTiles || {},
        // [FIX] store tileSize per floor so _drawLayer uses correct source px
        tileSize:   data.tileSize || 32,
      }));
      console.log('[DungeonMap] v2 format:', this.floors.length, 'floor(s)');
    } else {
      // Legacy format: dungeonData.levels[] or levels[]
      const src    = (data.dungeonData && data.dungeonData.levels) || data.levels || [{}];
      const width  = data.width  || 32;
      const height = data.height || 32;
      this.floors = [{
        name: 'Floor 1', width, height,
        ground:     src[0] || {},
        objects:    src[1] || {},
        roof:       {},
        stairsUp:   [], stairsDown: [],
        solidTiles: {},
        // [FIX] store tileSize
        tileSize:   data.tileSize || 32,
      }];
      console.log('[DungeonMap] legacy format -> 1 floor,', Object.keys(src[0]||{}).length, 'ground tiles');
    }

    // Auto-load all tilesets used
    const tsNames = new Set();
    this.floors.forEach(f => {
      [f.ground, f.objects, f.roof].forEach(layer => {
        Object.values(layer).forEach(t => { if (t && t.tileset) tsNames.add(t.tileset); });
      });
    });
    tsNames.forEach(n => this._loadTileset(n));
    return this;
  }

  _loadTileset(name) {
    if (this._imgs[name]) return;
    // [FIX] Do not load images here — game.html's ensureTileset() already handles this
    // with the correct tileSize (32px). _loadTileset previously loaded with TILE_SRC=16
    // which caused cols=44 instead of 22 because tileSize was unknown at that point.
    // game.html akan inject gambar via injectImages() setelah load selesai.
    console.log('[DungeonMap] Awaiting tileset via injectImages:', name);
  }

  // Accept already-loaded images from game.html's ts{} object
  injectImages(tsObj) {
    for (const [name, img] of Object.entries(tsObj)) {
      if (img && img.naturalWidth > 0) this._imgs[name] = img;
    }
  }

  get current() { return this.floors[this.activeFloor] || null; }

  goToFloor(idx, dir, cb) {
    if (idx < 0 || idx >= this.floors.length) return;
    this._transition = { to: idx, dir, progress: 0, cb };
  }

  _tickTransition() {
    if (!this._transition) return;
    this._transition.progress += 0.05;
    if (this._transition.progress >= 1) {
      this.activeFloor = this._transition.to;
      if (typeof this._transition.cb === 'function') this._transition.cb(this.activeFloor);
      this._transition = null;
    }
  }

  get transitionFade() {
    if (!this._transition) return 0;
    return Math.sin(this._transition.progress * Math.PI);
  }

  getStairAt(tx, ty) {
    const f = this.current;
    if (!f) return null;
    for (const s of (f.stairsUp   || [])) if (s.x===tx && s.y===ty) return {...s, dir:'up'};
    for (const s of (f.stairsDown || [])) if (s.x===tx && s.y===ty) return {...s, dir:'down'};
    return null;
  }

  // ── Main render ────────────────────────────────────────────────────────────
  // [FIX Bug #6] translated=true when caller has already done ctx.translate(-camX,-camY)
  //              translated=false (default) = game.html mode, no translate, manual offset
  render(ctx, camX, camY, canvasW, canvasH, now, translated) {
    animClock.tick(now);
    this._tickTransition();

    const floor = this.current;
    if (!floor) return;

    // Sync any newly loaded images
    if (window._dungeonTS) this.injectImages(window._dungeonTS);

    // Store mode so sub-methods use correct coordinate space
    this._translated = !!translated;

    this._drawLayer(ctx, floor.ground,  camX, camY, canvasW, canvasH, 1.0);
    this._drawLayer(ctx, floor.objects, camX, camY, canvasW, canvasH, 1.0);
    this._drawLayer(ctx, floor.roof,    camX, camY, canvasW, canvasH, 0.65);
    this._drawWaterShimmer(ctx, floor.ground, camX, camY, canvasW, canvasH, now);
    this._drawStairs(ctx, floor, camX, camY);

    // Fade overlay during transition
    const fade = this.transitionFade;
    if (fade > 0) {
      ctx.save();
      ctx.globalAlpha = fade * 0.92;
      ctx.fillStyle   = '#000';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();
    }
  }

  _drawLayer(ctx, layerDict, camX, camY, canvasW, canvasH, opacity) {
    if (!layerDict) return;
    const tDst = TILE_DST;
    // [FIX] Use the floor's tileSize as source px, not the hardcoded TILE_SRC=16.
    // tf_jungle and most dungeon-editor tilesets are 32px, not 16px.
    const tSrc = (this.current && this.current.tileSize) || TILE_SRC;
    ctx.save();
    if (opacity < 1) ctx.globalAlpha = opacity;

    const x0 = Math.floor(camX / tDst) - 1;
    const y0 = Math.floor(camY / tDst) - 1;
    const x1 = Math.ceil((camX + canvasW)  / tDst) + 1;
    const y1 = Math.ceil((camY + canvasH) / tDst) + 1;

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = layerDict[tx + ',' + ty];
        if (!t) continue;

        const anim    = ANIMATED_TILES.get(t.idx);
        const drawIdx = anim ? animClock.frame(anim) : t.idx;

        const sx = this._translated
          ? Math.round(tx * tDst)
          : Math.round(tx * tDst - camX);
        const sy = this._translated
          ? Math.round(ty * tDst)
          : Math.round(ty * tDst - camY);

        const img = this._imgs[t.tileset];
        if (img && img.naturalWidth > 0) {
          // [FIX] cols = sheet width / source tile size (not hardcoded 16)
          const cols = Math.floor(img.naturalWidth / tSrc);
          ctx.drawImage(
            img,
            (drawIdx % cols) * tSrc, Math.floor(drawIdx / cols) * tSrc, tSrc, tSrc,
            sx, sy, tDst, tDst
          );
        } else {
          ctx.fillStyle = this._fallbackColor(t.tileset, t.idx);
          ctx.fillRect(sx, sy, tDst, tDst);
          if (!this._imgs[t.tileset]) this._loadTileset(t.tileset);
        }
      }
    }
    ctx.restore();
  }

  _drawWaterShimmer(ctx, groundDict, camX, camY, canvasW, canvasH, now) {
    if (!groundDict) return;
    const ts = TILE_DST, t = now / 1000;
    ctx.save();
    for (const [key, tile] of Object.entries(groundDict)) {
      const anim = ANIMATED_TILES.get(tile.idx);
      if (!anim || anim.cat !== 'water') continue;
      const [tx, ty] = key.split(',').map(Number);
      // [FIX Bug #6] same coord logic as _drawLayer
      const sx = this._translated ? tx * ts : tx * ts - camX;
      const sy = this._translated ? ty * ts : ty * ts - camY;
      if (sx < -ts || sx > canvasW || sy < -ts || sy > canvasH) continue;
      const alpha = Math.sin(t*2.5+tx*0.8+ty*0.6)*0.12+0.12 + Math.cos(t*1.8+tx*0.5-ty*0.9)*0.08;
      ctx.globalAlpha = Math.min(0.28, alpha);
      ctx.fillStyle   = '#88ccff';
      ctx.fillRect(sx, sy, ts, ts);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle   = '#fff';
      ctx.beginPath();
      ctx.arc(sx+(Math.sin(t*3+tx+ty)*0.4+0.5)*ts, sy+(Math.cos(t*2.2+tx-ty)*0.4+0.5)*ts, 1.8, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawStairs(ctx, floor, camX, camY) {
    const ts = TILE_DST;
    const draw = (s, dir) => {
      // [FIX Bug #6] same coord logic as _drawLayer
      const baseX = this._translated ? s.x * ts : s.x * ts - camX;
      const baseY = this._translated ? s.y * ts : s.y * ts - camY;
      const sx = baseX + ts/2, sy = baseY + ts/2;
      ctx.save();
      ctx.shadowColor = dir==='up' ? '#ffe066' : '#ff8844';
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = dir==='up' ? '#ffe066' : '#ff8844';
      ctx.font = '20px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(dir==='up' ? '▲' : '▼', sx, sy);
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='7px Arial';
      ctx.fillText('F'+(s.toFloor+1), sx, sy+11);
      ctx.restore();
    };
    (floor.stairsUp||[]).forEach(s=>draw(s,'up'));
    (floor.stairsDown||[]).forEach(s=>draw(s,'down'));
  }

  _fallbackColor(tileset, idx) {
    if (tileset && tileset.includes('jungle')) {
      if (idx>=50&&idx<=56) return '#1a3a5c';
      if (idx>=23&&idx<=30) return '#2d4a1e';
    }
    if (tileset && tileset.includes('wall')) return '#111';
    return '#1a1a2e';
  }
}

// ─── StairManager ─────────────────────────────────────────────────────────────
class StairManager {
  constructor(dungeon) { this.map = dungeon; }
  check(px, py) {
    return this.map.getStairAt(Math.floor(px/TILE_DST), Math.floor(py/TILE_DST));
  }
  traverse(stair, onDone) {
    this.map.goToFloor(stair.toFloor, stair.dir, (newFloor) => {
      if (typeof onDone === 'function')
        onDone(stair.toX*TILE_DST + TILE_DST/2, stair.toY*TILE_DST + TILE_DST/2, newFloor);
    });
  }
}

// ─── Floor HUD ────────────────────────────────────────────────────────────────
// [FIX Bug #7] game.html already has a DOM #floor-hud element with its own
// updateFloorHUD(). Drawing a duplicate onto canvas caused two overlapping HUDs.
// This function now updates the DOM element if present; only falls back to
// canvas drawing if no DOM element is found (e.g. used from game.js directly).
function drawFloorHUD(ctx, dungeon, cW, cH) {
  const name = dungeon.current ? dungeon.current.name : 'Floor 1';
  const domEl = typeof document !== 'undefined' && document.getElementById('floor-hud');
  if (domEl) {
    // Update existing DOM HUD — no canvas draw needed
    domEl.textContent = '🏰 ' + name;
    return;
  }
  // Fallback: draw onto canvas (used when no DOM #floor-hud exists)
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(cW-145, cH-38, 135, 26);
  ctx.fillStyle='#ffe066'; ctx.font='bold 10px "Courier New"';
  ctx.textAlign='right'; ctx.textBaseline='middle';
  ctx.fillText('🏰 '+name, cW-14, cH-25);
  ctx.restore();
}

// ─── Export ───────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.DungeonMap     = DungeonMap;
  window.StairManager   = StairManager;
  window.drawFloorHUD   = drawFloorHUD;
  window.animClock      = animClock;
  window.ANIMATED_TILES = ANIMATED_TILES;
}