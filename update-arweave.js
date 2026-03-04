const fs = require('fs');
const cache = JSON.parse(fs.readFileSync('cache.json'));
const items = cache.items;

// Build index -> arweave URL mapping
const urlByIndex = {};
Object.keys(items).forEach(key => {
  if (key !== '-1') urlByIndex[parseInt(key)] = items[key].image_link;
});

// Load nft-cards.js
const cards = JSON.parse(
  fs.readFileSync('public/nft-cards.js', 'utf8')
    .replace('const NFT_CARDS =', '')
    .replace(/;?\s*$/, '')
);

// Update each card's img with Arweave URL
cards.forEach((card, index) => {
  if (urlByIndex[index]) {
    console.log(`[${index}] ${card.name} -> ${urlByIndex[index]}`);
    card.img = urlByIndex[index];
  }
});

// Write back
const output = 'const NFT_CARDS = ' + JSON.stringify(cards, null, 2) + ';\n';
fs.writeFileSync('public/nft-cards.js', output);
console.log('\nDone! All images updated to Arweave URLs.');
