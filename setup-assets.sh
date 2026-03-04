#!/bin/bash

# CatPunk Chaos - Automatic Assets Setup Script
# This script creates the necessary folder structure for characters and maps

echo "🎮 CatPunk Chaos - Assets Setup"
echo "================================"
echo ""

# Check if we're in the catpunk directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the ~/catpunk directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📁 Creating folder structure..."
echo ""

# Create maps folder
mkdir -p public/assets/maps
echo "✅ Created: public/assets/maps/"

# Create player base folder
mkdir -p public/assets/player
echo "✅ Created: public/assets/player/"

# Function to create character folders
create_character_folders() {
    local char_name=$1
    echo ""
    echo "Creating folders for: $char_name"
    
    local directions=("north" "south" "east" "west" "north-east" "north-west" "south-east" "south-west")
    
    for dir in "${directions[@]}"; do
        mkdir -p "public/assets/player/$char_name/$dir"
        echo "  ✅ public/assets/player/$char_name/$dir/"
    done
}

# Create default characters
echo ""
echo "🐱 Creating character folders..."
create_character_folders "cat-warrior"
create_character_folders "cat-mage"
create_character_folders "cat-rogue"

echo ""
echo "================================"
echo "✅ Folder structure created successfully!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Add your MAP files to:"
echo "   public/assets/maps/"
echo "   Example: public/assets/maps/forest.png"
echo ""
echo "2. Add your CHARACTER sprite frames to:"
echo "   public/assets/player/[character-name]/[direction]/"
echo "   "
echo "   Each direction needs 8 frames named:"
echo "   frame_000.png, frame_001.png, ..., frame_007.png"
echo ""
echo "   Example structure:"
echo "   public/assets/player/cat-warrior/north/frame_000.png"
echo "   public/assets/player/cat-warrior/north/frame_001.png"
echo "   ..."
echo ""
echo "3. View current structure:"
echo "   tree public/assets/ -L 3"
echo "   (or: find public/assets -type d)"
echo ""
echo "4. Copy the game file:"
echo "   cp catpunk-chaos.html public/game.html"
echo ""
echo "5. Start the server:"
echo "   npm start"
echo ""
echo "================================"
echo ""

# Show the created structure
echo "📂 Current structure:"
find public/assets -type d | sort

echo ""
echo "🎨 Asset Requirements:"
echo ""
echo "MAP Requirements:"
echo "  - Format: PNG or JPG"
echo "  - Size: Minimum 800x600px (recommended 1920x1080px)"
echo "  - Style: Pixel art, top-down view"
echo ""
echo "CHARACTER Requirements:"
echo "  - Format: PNG with transparency"
echo "  - Size: 24x24 pixels per frame (or multiples like 48x48)"
echo "  - Frames: 8 frames per direction (frame_000 to frame_007)"
echo "  - Directions: 8 directions (N, S, E, W, NE, NW, SE, SW)"
echo ""
echo "🚀 Ready to add your assets!"
echo ""
