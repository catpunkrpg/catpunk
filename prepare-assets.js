#!/usr/bin/env node
/**
 * prepare-assets.js
 * Converts CatPunk NFT images + nft-cards.js data
 * into Sugar-compatible assets/ folder format.
 *
 * Run: node prepare-assets.js
 */

const fs   = require('fs');
const path = require('path');

// ── NFT Cards data (from nft-cards.js) ───────────────────────────────────────
const NFT_CARDS = [
  { id:"6077954387356619888", name:"CLAW STRIKE",      power:"ATK 800",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619890", name:"PAW SLASH",         power:"ATK 750",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619893", name:"QUICK SCRATCH",     power:"SPD +15",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619895", name:"WHISKER WHIP",      power:"ATK 900",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619896", name:"TAIL SPIN",         power:"ATK 850",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619899", name:"FUR SHIELD",        power:"DEF 600",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619901", name:"CATNAP GUARD",      power:"DEF 750",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619904", name:"HISS BLAST",        power:"ATK 700",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619905", name:"BASIC POUNCE",      power:"ATK 820",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619906", name:"PIXEL PAW",         power:"ATK 780",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619907", name:"CYBER SWIPE",       power:"ATK 950",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619909", name:"GLITCH CLAW",       power:"ATK 880",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619912", name:"STATIC FUR",        power:"DEF 800",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619913", name:"NEON SCRATCH",      power:"ATK 1000",   rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619914", name:"PIXEL BITE",        power:"ATK 920",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619916", name:"BYTE SLASH",        power:"ATK 870",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619917", name:"CODE CLAW",         power:"ATK 960",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619918", name:"DATA PAW",          power:"SPD +20",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619925", name:"BOOT KICK",         power:"ATK 840",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619926", name:"SYSTEM ERROR",      power:"DEF 900",    rarity:"common",    color:"#6a6a9a" },
  { id:"6077954387356619927", name:"TIDAL CLAW",        power:"ATK 2800",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619928", name:"FROST BITE",        power:"ATK 2400",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619929", name:"SHADOW STEP",       power:"EVA +40%",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619931", name:"IRON FUR",          power:"DEF +3200",  rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619932", name:"STORM DASH",        power:"SPD +60%",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619933", name:"VOID LEAP",         power:"ATK 3100",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619946", name:"PLASMA SLASH",      power:"ATK 2600",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619947", name:"TURBO PAW",         power:"SPD +55%",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619949", name:"CYBER FANG",        power:"ATK 3400",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619950", name:"QUANTUM STEP",      power:"SPD +65%",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619951", name:"NEON BURST",        power:"ATK 2900",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619956", name:"LASER CLAW",        power:"ATK 3000",   rarity:"rare",      color:"#00f5ff" },
  { id:"6077954387356619984", name:"THUNDER POUNCE",    power:"ATK 5500",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356619991", name:"INFERNO SCRATCH",   power:"ATK 4900",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356619995", name:"VOID CLAW",         power:"ATK 5100",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356619996", name:"CYBER STORM",       power:"ATK 5300",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356619997", name:"PLASMA NOVA",       power:"ATK 4800",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356619999", name:"GLITCH FURY",       power:"ATK 5200",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356620000", name:"NEON HURRICANE",    power:"SPD +80%",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356620001", name:"QUANTUM SLASH",     power:"ATK 5600",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356620089", name:"DARK MATTER PAW",   power:"ATK 5400",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356620090", name:"BINARY BLAST",      power:"ATK 5000",   rarity:"epic",      color:"#9b30ff" },
  { id:"6077954387356620092", name:"DRAGON CLAW STRIKE",power:"ATK 9800",   rarity:"legendary", color:"#f5c842" },
  { id:"6077954387356620093", name:"COSMIC SLASH",      power:"ATK 12000",  rarity:"legendary", color:"#f5c842" },
  { id:"6077954387356620094", name:"STAR NOVA",         power:"ALL +200%",  rarity:"legendary", color:"#f5c842" },
  { id:"6077954387356620100", name:"OMEGA FURY",        power:"ATK 15000",  rarity:"legendary", color:"#f5c842" },
];

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SRC_DIR    = './public/assets/nft-mint';   // where your _cpunk.png files are
const DEST_DIR   = './assets';                    // Sugar assets folder
const COLLECTION_NAME = 'CatPunk Chaos';
const COLLECTION_DESC = 'CatPunk Chaos — 46 unique NFT battle cards. Fight, stake, and dominate the dungeon.';
const CREATOR    = '638SVmhGdA5v7ckrgGsbMyXXzGBmKGCP6P5VrL8HeAz5'; // your wallet
// For devnet testing — replace with real Arweave/IPFS URI after upload
const BASE_URI   = 'https://arweave.net/PLACEHOLDER';

// ── RARITY → NUMERIC SCORE ────────────────────────────────────────────────────
const RARITY_SCORE = { common: 1, rare: 2, epic: 3, legendary: 4 };

// ── SETUP ─────────────────────────────────────────────────────────────────────
if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

console.log('🐱 CatPunk — Preparing Sugar assets...\n');

let copied = 0;
let skipped = 0;

// ── PROCESS EACH CARD ─────────────────────────────────────────────────────────
NFT_CARDS.forEach((card, index) => {
  const srcImg  = path.join(SRC_DIR, `${card.id}_cpunk.png`);
  const destImg = path.join(DEST_DIR, `${index}.png`);
  const destJson= path.join(DEST_DIR, `${index}.json`);

  // Copy image
  if (fs.existsSync(srcImg)) {
    fs.copyFileSync(srcImg, destImg);
    copied++;
  } else {
    console.warn(`  ⚠️  Image not found: ${srcImg}`);
    skipped++;
  }

  // Build Metaplex metadata JSON
  const metadata = {
    name: card.name,
    symbol: "CATPUNK",
    description: `${card.name} — A CatPunk Chaos battle card. Rarity: ${card.rarity.toUpperCase()}. Power: ${card.power}.`,
    seller_fee_basis_points: 500,
    image: `${index}.png`,
    external_url: "https://catpunk.io",
    attributes: [
      { trait_type: "Rarity",    value: card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1) },
      { trait_type: "Power",     value: card.power },
      { trait_type: "Card ID",   value: card.id },
      { trait_type: "Rarity Score", value: RARITY_SCORE[card.rarity] },
    ],
    properties: {
      files: [{ uri: `${index}.png`, type: "image/png" }],
      category: "image",
      creators: [{ address: CREATOR, share: 100 }],
    },
    collection: { name: COLLECTION_NAME, family: "CatPunk" },
  };

  fs.writeFileSync(destJson, JSON.stringify(metadata, null, 2));
  console.log(`  ✅ [${String(index).padStart(2,'0')}] ${card.name.padEnd(22)} | ${card.rarity.padEnd(9)} | ${card.power}`);
});

// ── COLLECTION METADATA ───────────────────────────────────────────────────────
// collection.png — copy first legendary card as collection image
const legendaryCard = NFT_CARDS.find(c => c.rarity === 'legendary');
if (legendaryCard) {
  const legendaryIdx = NFT_CARDS.indexOf(legendaryCard);
  const collectionImgSrc = path.join(DEST_DIR, `${legendaryIdx}.png`);
  if (fs.existsSync(collectionImgSrc)) {
    fs.copyFileSync(collectionImgSrc, path.join(DEST_DIR, 'collection.png'));
  }
}

const collectionJson = {
  name: COLLECTION_NAME,
  symbol: "CATPUNK",
  description: COLLECTION_DESC,
  image: "collection.png",
  external_url: "https://catpunk.io",
  seller_fee_basis_points: 500,
  properties: {
    files: [{ uri: "collection.png", type: "image/png" }],
    category: "image",
    creators: [{ address: CREATOR, share: 100 }],
  },
};

fs.writeFileSync(path.join(DEST_DIR, 'collection.json'), JSON.stringify(collectionJson, null, 2));

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`✅ Assets ready in: ${DEST_DIR}/`);
console.log(`   Images copied : ${copied}`);
console.log(`   Images missing: ${skipped}`);
console.log(`   JSON files    : ${NFT_CARDS.length} + 1 collection`);
console.log('\n📋 Next steps:');
console.log('   1. sudo sugar validate');
console.log('   2. sudo sugar upload');
console.log('   3. sudo sugar deploy');
console.log('   4. sudo sugar verify');
console.log('─'.repeat(50));
