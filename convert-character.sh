#!/bin/bash

# CatPunk Character Converter
# Converts single character image into 8-direction animated frames

echo "😼 CatPunk Character Converter"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check ImageMagick
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick not installed${NC}"
    echo ""
    echo "Install with:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install imagemagick"
    exit 1
fi

# Input file
INPUT_FILE="$1"

if [ -z "$INPUT_FILE" ]; then
    echo "Usage: ./convert-character.sh <input-image.png>"
    echo ""
    echo "Example:"
    echo "  ./convert-character.sh my-character.png"
    exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ File not found: $INPUT_FILE${NC}"
    exit 1
fi

# Character name (without extension)
CHAR_NAME=$(basename "$INPUT_FILE" | sed 's/\.[^.]*$//')
CHAR_NAME=$(echo "$CHAR_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

# Output directory
OUTPUT_DIR="public/assets/player/$CHAR_NAME"

echo -e "${BLUE}📁 Creating character: $CHAR_NAME${NC}"
echo ""

# Create directories
mkdir -p "$OUTPUT_DIR"/{north,south,east,west,north-east,north-west,south-east,south-west}

echo -e "${YELLOW}🎨 Processing sprite...${NC}"

# Resize to 24x24 (game requirement)
TEMP_24="temp_24x24.png"
convert "$INPUT_FILE" -resize 24x24 "$TEMP_24"

# Generate frames for each direction
DIRECTIONS=("north" "south" "east" "west" "north-east" "north-west" "south-east" "south-west")

for dir in "${DIRECTIONS[@]}"; do
    echo -e "${BLUE}  → Generating $dir frames...${NC}"
    
    for frame in {0..7}; do
        frame_num=$(printf "%03d" $frame)
        output="$OUTPUT_DIR/$dir/frame_$frame_num.png"
        
        # Create animated frames with slight variations
        # For now, we'll use the base sprite with small offsets for animation
        case $frame in
            0|2|4|6)
                # Standing frames
                convert "$TEMP_24" "$output"
                ;;
            1|5)
                # Move up slightly
                convert "$TEMP_24" -background transparent -extent 24x25 -gravity south "$output"
                convert "$output" -crop 24x24+0+0 +repage "$output"
                ;;
            3|7)
                # Move down slightly
                convert "$TEMP_24" -background transparent -extent 24x25 -gravity north "$output"
                convert "$output" -crop 24x24+0+1 +repage "$output"
                ;;
        esac
        
        # Apply rotation based on direction
        case $dir in
            "north")
                # Facing up - no rotation needed
                ;;
            "south")
                # Facing down - already correct
                ;;
            "east")
                # Facing right - flip horizontally
                convert "$output" -flop "$output"
                ;;
            "west")
                # Facing left - keep as is
                ;;
            "north-east")
                # Diagonal NE
                convert "$output" -flop "$output"
                ;;
            "north-west")
                # Diagonal NW
                ;;
            "south-east")
                # Diagonal SE
                convert "$output" -flop "$output"
                ;;
            "south-west")
                # Diagonal SW
                ;;
        esac
    done
    
    echo -e "${GREEN}    ✅ 8 frames created${NC}"
done

# Clean up temp file
rm -f "$TEMP_24"

echo ""
echo -e "${GREEN}✅ Character created successfully!${NC}"
echo ""
echo "📁 Output location:"
echo "   $OUTPUT_DIR/"
echo ""
echo "📋 Frame structure:"
find "$OUTPUT_DIR" -name "frame_*.png" | head -8
echo "   ... (64 total frames)"
echo ""
echo "🎮 Next steps:"
echo "  1. Verify frames: ls $OUTPUT_DIR/south/"
echo "  2. Test in game: npm start"
echo "  3. Character will be: $CHAR_NAME"
echo ""
