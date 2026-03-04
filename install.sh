#!/bin/bash

# CatPunk Chaos - All-in-One Installer
# This script will set up everything needed to run the game

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art
echo -e "${PURPLE}"
cat << "EOF"
 ██████╗ █████╗ ████████╗██████╗ ██╗   ██╗███╗   ██╗██╗  ██╗
██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║   ██║████╗  ██║██║ ██╔╝
██║     ███████║   ██║   ██████╔╝██║   ██║██╔██╗ ██║█████╔╝ 
██║     ██╔══██║   ██║   ██╔═══╝ ██║   ██║██║╚██╗██║██╔═██╗ 
╚██████╗██║  ██║   ██║   ██║     ╚██████╔╝██║ ╚████║██║  ██╗
 ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝
                                                              
       C H A O S   -   C R Y P T O   M M O R P G            
EOF
echo -e "${NC}"
echo ""
echo -e "${CYAN}=== Installation & Setup Script ===${NC}"
echo ""

# Check if we're in the catpunk directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the ~/catpunk directory"
    exit 1
fi

echo -e "${BLUE}📋 Pre-flight checks...${NC}"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not installed${NC}"
    echo "Please install Node.js first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not installed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}   What would you like to do?${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""
echo "  1) 🚀 Full Setup (Everything)"
echo "  2) 📦 Install npm packages only"
echo "  3) 📁 Setup asset folders only"
echo "  4) 🎨 Generate test assets (dummy)"
echo "  5) ✅ Verify assets"
echo "  6) 🎮 Copy game file & start server"
echo "  7) 🔍 Diagnostic check"
echo ""
read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo ""
        echo -e "${CYAN}Starting full setup...${NC}"
        echo ""
        
        # 1. Install npm packages
        echo -e "${BLUE}📦 Step 1/5: Installing npm packages...${NC}"
        if [ -d "node_modules" ]; then
            echo "node_modules already exists, skipping..."
        else
            npm install
            echo -e "${GREEN}✅ Packages installed${NC}"
        fi
        echo ""
        
        # 2. Setup folders
        echo -e "${BLUE}📁 Step 2/5: Creating asset folders...${NC}"
        chmod +x setup-assets.sh 2>/dev/null || true
        if [ -f "setup-assets.sh" ]; then
            ./setup-assets.sh
        else
            mkdir -p public/assets/maps
            mkdir -p public/assets/player/cat-warrior/{north,south,east,west,north-east,north-west,south-east,south-west}
            echo -e "${GREEN}✅ Folders created${NC}"
        fi
        echo ""
        
        # 3. Ask about assets
        echo -e "${BLUE}🎨 Step 3/5: Asset setup${NC}"
        echo ""
        echo "Do you want to:"
        echo "  a) Generate test assets (dummy sprites for testing)"
        echo "  b) Skip (I'll add my own assets manually)"
        echo ""
        read -p "Choose (a/b): " asset_choice
        
        if [[ $asset_choice == "a" || $asset_choice == "A" ]]; then
            if command -v convert &> /dev/null; then
                chmod +x generate-test-assets.sh 2>/dev/null || true
                if [ -f "generate-test-assets.sh" ]; then
                    echo "y" | ./generate-test-assets.sh
                    echo -e "${GREEN}✅ Test assets generated${NC}"
                else
                    echo -e "${YELLOW}⚠️  generate-test-assets.sh not found${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️  ImageMagick not installed, skipping test assets${NC}"
                echo "Install with: sudo apt-get install imagemagick"
            fi
        else
            echo -e "${YELLOW}ℹ️  Skipped. Add your assets to public/assets/${NC}"
        fi
        echo ""
        
        # 4. Copy game file
        echo -e "${BLUE}📄 Step 4/5: Copying game file...${NC}"
        if [ -f "catpunk-chaos.html" ]; then
            cp catpunk-chaos.html public/game.html
            echo -e "${GREEN}✅ Game file copied to public/game.html${NC}"
        else
            echo -e "${YELLOW}⚠️  catpunk-chaos.html not found${NC}"
        fi
        echo ""
        
        # 5. Verify
        echo -e "${BLUE}🔍 Step 5/5: Verifying setup...${NC}"
        chmod +x verify-assets.sh 2>/dev/null || true
        if [ -f "verify-assets.sh" ]; then
            ./verify-assets.sh
        else
            echo -e "${YELLOW}⚠️  verify-assets.sh not found${NC}"
        fi
        echo ""
        
        # Done!
        echo -e "${GREEN}═══════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ Setup complete!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════${NC}"
        echo ""
        echo -e "${CYAN}🚀 To start the game:${NC}"
        echo "   npm start"
        echo ""
        echo -e "${CYAN}🌐 Then open in browser:${NC}"
        echo "   http://localhost:3000/game.html"
        echo ""
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}📦 Installing npm packages...${NC}"
        npm install
        echo -e "${GREEN}✅ Done!${NC}"
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}📁 Setting up asset folders...${NC}"
        chmod +x setup-assets.sh 2>/dev/null || true
        if [ -f "setup-assets.sh" ]; then
            ./setup-assets.sh
        else
            mkdir -p public/assets/maps
            mkdir -p public/assets/player/cat-warrior/{north,south,east,west,north-east,north-west,south-east,south-west}
            echo -e "${GREEN}✅ Folders created${NC}"
        fi
        ;;
        
    4)
        echo ""
        if ! command -v convert &> /dev/null; then
            echo -e "${RED}❌ ImageMagick not installed${NC}"
            echo "Install with: sudo apt-get install imagemagick"
            exit 1
        fi
        echo -e "${BLUE}🎨 Generating test assets...${NC}"
        chmod +x generate-test-assets.sh 2>/dev/null || true
        if [ -f "generate-test-assets.sh" ]; then
            echo "y" | ./generate-test-assets.sh
        else
            echo -e "${RED}❌ generate-test-assets.sh not found${NC}"
        fi
        ;;
        
    5)
        echo ""
        echo -e "${BLUE}🔍 Verifying assets...${NC}"
        chmod +x verify-assets.sh 2>/dev/null || true
        if [ -f "verify-assets.sh" ]; then
            ./verify-assets.sh
        else
            echo -e "${RED}❌ verify-assets.sh not found${NC}"
        fi
        ;;
        
    6)
        echo ""
        echo -e "${BLUE}📄 Copying game file...${NC}"
        if [ -f "catpunk-chaos.html" ]; then
            cp catpunk-chaos.html public/game.html
            echo -e "${GREEN}✅ Game file copied${NC}"
        else
            echo -e "${RED}❌ catpunk-chaos.html not found${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${BLUE}🚀 Starting server...${NC}"
        echo ""
        echo -e "${CYAN}Server will start on http://localhost:3000${NC}"
        echo -e "${CYAN}Game URL: http://localhost:3000/game.html${NC}"
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
        echo ""
        npm start
        ;;
        
    7)
        echo ""
        echo -e "${BLUE}🔍 Running diagnostic check...${NC}"
        echo ""
        
        # Check Node & npm
        echo -e "${CYAN}Node.js:${NC} $(node --version 2>/dev/null || echo 'Not installed')"
        echo -e "${CYAN}npm:${NC} $(npm --version 2>/dev/null || echo 'Not installed')"
        echo ""
        
        # Check folders
        echo -e "${CYAN}Checking folders:${NC}"
        [ -d "public/assets/maps" ] && echo -e "${GREEN}✅${NC} public/assets/maps/" || echo -e "${RED}❌${NC} public/assets/maps/"
        [ -d "public/assets/player" ] && echo -e "${GREEN}✅${NC} public/assets/player/" || echo -e "${RED}❌${NC} public/assets/player/"
        echo ""
        
        # Check files
        echo -e "${CYAN}Checking files:${NC}"
        [ -f "package.json" ] && echo -e "${GREEN}✅${NC} package.json" || echo -e "${RED}❌${NC} package.json"
        [ -f "server.js" ] && echo -e "${GREEN}✅${NC} server.js" || echo -e "${RED}❌${NC} server.js"
        [ -f "public/game.html" ] && echo -e "${GREEN}✅${NC} public/game.html" || echo -e "${RED}❌${NC} public/game.html"
        [ -f "catpunk-chaos.html" ] && echo -e "${GREEN}✅${NC} catpunk-chaos.html" || echo -e "${RED}❌${NC} catpunk-chaos.html"
        echo ""
        
        # Check node_modules
        if [ -d "node_modules" ]; then
            echo -e "${GREEN}✅${NC} node_modules installed"
        else
            echo -e "${RED}❌${NC} node_modules not found (run: npm install)"
        fi
        echo ""
        
        # Count assets
        if [ -d "public/assets/maps" ]; then
            map_count=$(find public/assets/maps -name "*.png" -o -name "*.jpg" 2>/dev/null | wc -l)
            echo -e "${CYAN}Maps found:${NC} $map_count"
        fi
        
        if [ -d "public/assets/player" ]; then
            char_count=$(find public/assets/player -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
            echo -e "${CYAN}Characters found:${NC} $char_count"
        fi
        echo ""
        
        # Port check
        if lsof -i :3000 &> /dev/null; then
            echo -e "${YELLOW}⚠️  Port 3000 is in use${NC}"
        else
            echo -e "${GREEN}✅${NC} Port 3000 is available"
        fi
        echo ""
        ;;
        
    *)
        echo ""
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${PURPLE}  CatPunk Chaos - Ready to dominate!${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""
