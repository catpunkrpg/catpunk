# 😼 CatPunk Warrior Character

## 📦 Character Package

Character sprite yang sudah di-convert ke format CatPunk Chaos game!

### ✅ What's Included

- **64 PNG files** - Complete animation set
- **8 directions** - north, south, east, west, NE, NW, SE, SW
- **8 frames per direction** - Smooth walking animation
- **24x24 pixels** - Optimized for game
- **Transparent background** - Ready to use

---

## 🚀 Installation (Quick - 3 Steps!)

### Step 1: Copy Character Folder
```bash
# Copy entire cat-punk-warrior folder
cp -r cat-punk-warrior ~/catpunk/public/assets/player/

# Or if you're in ~/catpunk already:
cp -r /path/to/cat-punk-warrior public/assets/player/
```

### Step 2: Verify Installation
```bash
cd ~/catpunk

# Check if files exist (should show 8 frames)
ls public/assets/player/cat-punk-warrior/south/

# Output should be:
# frame_000.png  frame_001.png  frame_002.png  frame_003.png
# frame_004.png  frame_005.png  frame_006.png  frame_007.png
```

### Step 3: Update Game to Use This Character
```bash
# Edit catpunk-chaos.html or public/game.html
# Find this line (around line 1240):
#   character: 'cat-warrior'
# 
# Change to:
#   character: 'cat-punk-warrior'
```

**OR** update server.js:
```javascript
// Find this line (around line 30):
character: 'cat-warrior', // default character

// Change to:
character: 'cat-punk-warrior',
```

---

## 🎮 Start Game

```bash
cd ~/catpunk
npm start
```

Open browser: **http://localhost:3000/game.html**

Your custom CatPunk character will now appear! 😼⚔️

---

## 📁 Folder Structure

```
cat-punk-warrior/
├── north/
│   ├── frame_000.png
│   ├── frame_001.png
│   ├── ...
│   └── frame_007.png  (8 frames)
├── south/  (8 frames)
├── east/  (8 frames)
├── west/  (8 frames)
├── north-east/  (8 frames)
├── north-west/  (8 frames)
├── south-east/  (8 frames)
└── south-west/  (8 frames)

Total: 64 files (8 directions × 8 frames)
```

---

## 🔧 Advanced: Multiple Characters

Want to add more characters? Follow this structure:

```
public/assets/player/
├── cat-punk-warrior/     ← Your character
│   ├── north/ (8 frames)
│   ├── south/ (8 frames)
│   └── ...
├── cat-mage/             ← Another character
│   ├── north/ (8 frames)
│   └── ...
└── cat-rogue/            ← Another character
    └── ...
```

Then in server.js, change character selection:
```javascript
// Random character selection
const characters = ['cat-punk-warrior', 'cat-mage', 'cat-rogue'];
const randomChar = characters[Math.floor(Math.random() * characters.length)];

players[socket.id] = {
  // ...
  character: randomChar  // Random character each join
};
```

---

## 🎨 Original Character

This character was converted from:
- **Source**: Your custom pixel art
- **Original size**: 500x500px
- **Converted to**: 24x24px sprites
- **Format**: PNG with transparency
- **Theme**: CatPunk Cyberpunk style

---

## ✅ Verification Checklist

After installation, check:

- [ ] Folder exists: `public/assets/player/cat-punk-warrior/`
- [ ] All 8 direction folders exist
- [ ] Each direction has 8 frames (frame_000 to frame_007)
- [ ] All files are PNG format
- [ ] Game character set to 'cat-punk-warrior'
- [ ] Server starts without errors
- [ ] Character appears in game
- [ ] Character animates when moving

---

## 🐛 Troubleshooting

### Character Not Showing
```bash
# Check if files exist
ls public/assets/player/cat-punk-warrior/south/

# Should show 8 PNG files
# If not, re-copy the folder
```

### Character Name Mismatch
```bash
# In server.js, ensure exact name match:
character: 'cat-punk-warrior'  // ✅ Correct
character: 'catpunkwarrior'     // ❌ Wrong
character: 'cat-punk-Warrior'   // ❌ Wrong (capital W)
```

### Still Using Old Character
```bash
# Clear browser cache
# Press Ctrl+F5 in browser

# Or restart server
npm start
```

---

## 📝 Character Customization

### Change Character Name
```bash
# Rename folder
mv cat-punk-warrior my-custom-character

# Update in code:
character: 'my-custom-character'
```

### Add More Frames
Current: 8 frames per direction

If you want more frames (e.g., 16):
1. Create more PNG files: frame_008.png, frame_009.png, etc.
2. Update FRAME_COUNT in game code

---

## 🎯 Performance Tips

24x24 pixels is optimal for:
- ✅ Fast loading
- ✅ Smooth animation at 60 FPS
- ✅ Low memory usage
- ✅ Works on mobile devices

If you want higher resolution:
- Use 48x48 or 96x96 (multiples of 24)
- Update FRAME_WIDTH and FRAME_HEIGHT in code

---

## 🌟 Credits

- **Character Design**: Your custom artwork
- **Conversion**: CatPunk Chaos Character Converter
- **Game**: CatPunk Chaos MMORPG

---

## 🆘 Need Help?

1. Check main [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
2. Verify with: `./verify-assets.sh`
3. Check browser console (F12) for errors
4. Ensure server running: `npm start`

---

**Enjoy your custom CatPunk character! 😼⚔️💎**
