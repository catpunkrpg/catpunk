# 😼 Quick Start - CatPunk Warrior Character

## 🎯 Super Quick Install (3 Commands!)

```bash
# 1. Extract character
cd ~/catpunk
tar -xzf cat-punk-warrior.tar.gz -C public/assets/player/

# 2. Update game to use this character
# Edit server.js line ~30, change:
#   character: 'cat-warrior'
# to:
#   character: 'cat-punk-warrior'

# 3. Start!
npm start
```

Open: http://localhost:3000/game.html

**DONE!** 🎉 Your character is now in the game!

---

## 📦 What You Got

✅ **65 PNG files** total:
- 64 animation frames (8 directions × 8 frames each)
- 1 base sprite (bonus)

✅ **Ready to use** - No additional processing needed

✅ **Optimized** - 24x24 pixels, perfect for pixel art games

---

## 🔧 Manual Installation (Detailed)

### If tar command doesn't work:

```bash
# 1. Create directory
mkdir -p ~/catpunk/public/assets/player/cat-punk-warrior

# 2. Unzip or extract the cat-punk-warrior folder
# Copy all 8 direction folders into:
#   ~/catpunk/public/assets/player/cat-punk-warrior/

# 3. Verify
ls ~/catpunk/public/assets/player/cat-punk-warrior/
# Should show: north, south, east, west, north-east, north-west, south-east, south-west

# 4. Check frames
ls ~/catpunk/public/assets/player/cat-punk-warrior/south/
# Should show: frame_000.png through frame_007.png
```

---

## ⚙️ Configuration

### Option A: Set as Default Character

Edit `server.js` (line ~30):
```javascript
character: 'cat-punk-warrior',  // ← Change this line
```

### Option B: Character Selection Menu

Edit `server.js`:
```javascript
// Add to available characters
const availableCharacters = [
  'cat-warrior',
  'cat-punk-warrior',  // ← Your character
  'cat-mage'
];

// Random selection
const randomChar = availableCharacters[
  Math.floor(Math.random() * availableCharacters.length)
];

players[socket.id] = {
  // ...
  character: randomChar
};
```

### Option C: Let Players Choose

In HTML, add character selection UI:
```html
<div class="character-select">
  <div class="char-option" data-char="cat-punk-warrior">
    <img src="/assets/player/cat-punk-warrior/south/frame_000.png">
    <p>Punk Warrior</p>
  </div>
  <!-- More characters -->
</div>
```

---

## ✅ Verification

After installation:

```bash
# Check installation
./verify-assets.sh

# OR manually check:
ls -la public/assets/player/cat-punk-warrior/south/

# Should output 8 files:
# frame_000.png  frame_004.png
# frame_001.png  frame_005.png
# frame_002.png  frame_006.png
# frame_003.png  frame_007.png
```

---

## 🎮 Test in Game

1. Start server: `npm start`
2. Open: http://localhost:3000/game.html
3. Move with **WASD**
4. Your character should animate! 😼

---

## 🐛 Common Issues

### "Character not showing"
```bash
# Check character name matches exactly
# server.js: character: 'cat-punk-warrior'
# folder name: cat-punk-warrior
# (case-sensitive, hyphens matter!)
```

### "Still see old character"
```bash
# Clear browser cache
# Press Ctrl+Shift+R (hard refresh)

# OR restart server
npm start
```

### "404 errors in console"
```bash
# Check file paths
ls public/assets/player/cat-punk-warrior/

# Ensure all 8 folders exist
# north, south, east, west, NE, NW, SE, SW
```

---

## 🎨 Customize Further

### Change Character Size

In game code, update:
```javascript
const FRAME_WIDTH = 24;   // Change to 48 for bigger
const FRAME_HEIGHT = 24;  // Change to 48 for bigger
```

### Add More Animations

Current: 8 frames (walk cycle)

To add idle/attack/jump:
1. Create new folders: `idle/`, `attack/`, `jump/`
2. Add 8 frames to each
3. Update game logic to switch animations

---

## 📚 Full Documentation

- [Character README](cat-punk-warrior/README.md) - Full details
- [Main TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Problem solving
- [CHARACTER-MAP-SETUP-GUIDE.md](CHARACTER-MAP-SETUP-GUIDE.md) - Asset guide

---

## 🌟 Your Character Stats

- **Style**: CatPunk Cyberpunk
- **Weapon**: Pink/Red Axe
- **Outfit**: Brown Jacket, Blue Jeans, Red Boots
- **Accessories**: Sunglasses, Cool Hair
- **Vibe**: 😎 Ultimate CatPunk Warrior

---

## 🚀 Next Steps

1. ✅ Install character (done!)
2. 🎮 Test in game
3. 🎨 Add more characters?
4. 🌐 Share with friends
5. 🚀 Deploy to production

---

**Enjoy your custom character! 😼⚔️💎**
