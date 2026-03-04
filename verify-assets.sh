#!/bin/bash

# CatPunk Chaos - Assets Verification Script
# This script checks if all assets are properly configured

echo "🔍 CatPunk Chaos - Assets Verification"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in catpunk directory${NC}"
    exit 1
fi

echo "📁 Checking folder structure..."
echo ""

# Check maps folder
if [ -d "public/assets/maps" ]; then
    echo -e "${GREEN}✅ Maps folder exists${NC}"
    
    # Check for map files
    map_count=$(find public/assets/maps -name "*.png" -o -name "*.jpg" | wc -l)
    if [ $map_count -gt 0 ]; then
        echo -e "${GREEN}✅ Found $map_count map file(s)${NC}"
        find public/assets/maps -name "*.png" -o -name "*.jpg" | while read file; do
            echo "   📍 $(basename $file)"
        done
    else
        echo -e "${YELLOW}⚠️  No map files found (.png or .jpg)${NC}"
        warnings=$((warnings+1))
    fi
else
    echo -e "${RED}❌ Maps folder missing${NC}"
    errors=$((errors+1))
fi

echo ""

# Check player folder
if [ -d "public/assets/player" ]; then
    echo -e "${GREEN}✅ Player folder exists${NC}"
    
    # Check for character folders
    char_count=$(find public/assets/player -mindepth 1 -maxdepth 1 -type d | wc -l)
    if [ $char_count -gt 0 ]; then
        echo -e "${GREEN}✅ Found $char_count character folder(s)${NC}"
        
        # Check each character
        for char_dir in public/assets/player/*/; do
            if [ -d "$char_dir" ]; then
                char_name=$(basename "$char_dir")
                echo ""
                echo "  🐱 Checking character: $char_name"
                
                # Check each direction
                directions=("north" "south" "east" "west" "north-east" "north-west" "south-east" "south-west")
                for dir in "${directions[@]}"; do
                    if [ -d "$char_dir$dir" ]; then
                        # Count frames
                        frame_count=$(ls "$char_dir$dir"/frame_*.png 2>/dev/null | wc -l)
                        
                        if [ $frame_count -eq 8 ]; then
                            echo -e "     ${GREEN}✅ $dir: $frame_count frames${NC}"
                        elif [ $frame_count -gt 0 ]; then
                            echo -e "     ${YELLOW}⚠️  $dir: $frame_count frames (need 8)${NC}"
                            warnings=$((warnings+1))
                        else
                            echo -e "     ${RED}❌ $dir: No frames found${NC}"
                            errors=$((errors+1))
                        fi
                    else
                        echo -e "     ${RED}❌ $dir: Folder missing${NC}"
                        errors=$((errors+1))
                    fi
                done
            fi
        done
    else
        echo -e "${YELLOW}⚠️  No character folders found${NC}"
        warnings=$((warnings+1))
    fi
else
    echo -e "${RED}❌ Player folder missing${NC}"
    errors=$((errors+1))
fi

echo ""
echo "======================================"
echo "📊 Verification Summary:"
echo ""

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}🎉 All assets are properly configured!${NC}"
    echo ""
    echo "✅ You can now start the game:"
    echo "   npm start"
    echo ""
    echo "🌐 Then open: http://localhost:3000/game.html"
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Setup complete with $warnings warning(s)${NC}"
    echo ""
    echo "Your game should work, but consider fixing the warnings above."
else
    echo -e "${RED}❌ Found $errors error(s) and $warnings warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before running the game."
    echo ""
    echo "📚 For help, see: CHARACTER-MAP-SETUP-GUIDE.md"
fi

echo ""
echo "======================================"
echo ""

# Detailed asset info
echo "📋 Detailed Asset Information:"
echo ""

# Map info
echo "MAPS:"
if [ -d "public/assets/maps" ]; then
    find public/assets/maps -name "*.png" -o -name "*.jpg" | while read file; do
        if [ -f "$file" ]; then
            size=$(du -h "$file" | cut -f1)
            echo "  📍 $(basename $file) - $size"
        fi
    done
    if [ $map_count -eq 0 ]; then
        echo "  (No maps found)"
    fi
else
    echo "  (Folder not found)"
fi

echo ""
echo "CHARACTERS:"
if [ -d "public/assets/player" ]; then
    for char_dir in public/assets/player/*/; do
        if [ -d "$char_dir" ]; then
            char_name=$(basename "$char_dir")
            total_frames=$(find "$char_dir" -name "frame_*.png" | wc -l)
            total_size=$(du -sh "$char_dir" 2>/dev/null | cut -f1)
            echo "  🐱 $char_name - $total_frames total frames - $total_size"
        fi
    done
    if [ $char_count -eq 0 ]; then
        echo "  (No characters found)"
    fi
else
    echo "  (Folder not found)"
fi

echo ""
echo "======================================"
echo ""

# Quick setup reminder
if [ $errors -gt 0 ] || [ $warnings -gt 0 ]; then
    echo "💡 Quick Fix Guide:"
    echo ""
    
    if [ $map_count -eq 0 ]; then
        echo "To add a map:"
        echo "  cp /path/to/your/map.png public/assets/maps/forest.png"
        echo ""
    fi
    
    if [ $char_count -eq 0 ]; then
        echo "To add character sprites:"
        echo "  1. Create folder: mkdir -p public/assets/player/cat-warrior/north"
        echo "  2. Add 8 frames: frame_000.png to frame_007.png"
        echo "  3. Repeat for all 8 directions"
        echo ""
    fi
    
    echo "Run './setup-assets.sh' to create folder structure"
    echo "See 'CHARACTER-MAP-SETUP-GUIDE.md' for detailed instructions"
    echo ""
fi

exit $errors
