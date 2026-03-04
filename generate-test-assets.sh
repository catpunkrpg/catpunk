#!/bin/bash

# CatPunk Chaos - Generate Test Assets
# This script creates dummy assets for testing purposes
# Requires: ImageMagick (sudo apt-get install imagemagick)

echo "🎨 CatPunk Chaos - Generate Test Assets"
echo "========================================"
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ Error: ImageMagick is not installed"
    echo ""
    echo "Install it with:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install imagemagick"
    echo ""
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the ~/catpunk directory"
    exit 1
fi

echo "This will create DUMMY TEST ASSETS for quick testing."
echo "Replace these with your real assets later!"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "📁 Creating folder structure..."
./setup-assets.sh > /dev/null 2>&1

echo ""
echo "🗺️  Generating test maps..."

# Generate a test forest map (1920x1080)
convert -size 1920x1080 \
    -seed 42 \
    plasma:green-darkgreen \
    -blur 0x2 \
    public/assets/maps/forest.png
echo "✅ Generated: public/assets/maps/forest.png (1920x1080)"

# Generate a test city map
convert -size 1920x1080 \
    -seed 123 \
    plasma:blue-darkblue \
    -blur 0x2 \
    public/assets/maps/cyber_city.png
echo "✅ Generated: public/assets/maps/cyber_city.png (1920x1080)"

# Generate a test dungeon map
convert -size 1920x1080 \
    -seed 456 \
    plasma:gray-black \
    -blur 0x2 \
    public/assets/maps/dungeon.png
echo "✅ Generated: public/assets/maps/dungeon.png (1920x1080)"

echo ""
echo "😼 Generating test character sprites..."

# Function to generate character sprites
generate_character_sprites() {
    local char_name=$1
    local color=$2
    
    echo ""
    echo "Generating: $char_name"
    
    local directions=("north" "south" "east" "west" "north-east" "north-west" "south-east" "south-west")
    
    for dir in "${directions[@]}"; do
        # Generate 8 frames for this direction
        for i in {0..7}; do
            frame_num=$(printf "%03d" $i)
            
            # Create a simple 24x24 sprite with animation
            # Different colors for different characters
            convert -size 24x24 xc:transparent \
                -fill "$color" \
                -draw "circle 12,12 12,$((6 + i))" \
                -fill white \
                -draw "circle 8,8 8,9" \
                -draw "circle 16,8 16,9" \
                -draw "rectangle 10,16 14,$((18 + (i % 2)))" \
                "public/assets/player/$char_name/$dir/frame_$frame_num.png"
        done
        echo "  ✅ $dir (8 frames)"
    done
}

# Generate test characters with different colors
generate_character_sprites "cat-warrior" "#FF6B6B"  # Red
generate_character_sprites "cat-mage" "#4ECDC4"     # Cyan
generate_character_sprites "cat-rogue" "#FFE66D"    # Yellow

echo ""
echo "========================================"
echo "✅ Test assets generated successfully!"
echo ""
echo "📋 What was created:"
echo ""
echo "MAPS (3):"
echo "  📍 forest.png (green theme)"
echo "  📍 cyber_city.png (blue theme)"
echo "  📍 dungeon.png (dark theme)"
echo ""
echo "CHARACTERS (3):"
echo "  🐱 cat-warrior (red) - 64 frames"
echo "  🐱 cat-mage (cyan) - 64 frames"
echo "  🐱 cat-rogue (yellow) - 64 frames"
echo ""
echo "⚠️  NOTE: These are DUMMY TEST ASSETS!"
echo "   Replace them with your real pixel art assets."
echo ""
echo "🚀 Next steps:"
echo "  1. Start the server: npm start"
echo "  2. Open: http://localhost:3000/game.html"
echo "  3. Test the game with dummy assets"
echo "  4. Replace with real assets when ready"
echo ""
echo "To verify assets:"
echo "  ./verify-assets.sh"
echo ""
echo "========================================"
echo ""
