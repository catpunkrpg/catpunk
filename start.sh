#!/bin/bash

# CatPunk Chaos - Start Script
# This script ensures everything is ready before starting the server

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo -e "${PURPLE}"
cat << "EOF"
╔══════════════════════════════════════════╗
║  😼 CATPUNK CHAOS - CRYPTO MMORPG 😼   ║
╚══════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}Starting up...${NC}"
echo ""

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
echo -e "${BLUE}[1/5]${NC} Checking Node.js..."
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check npm
echo -e "${BLUE}[2/5]${NC} Checking npm..."
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found!"
    exit 1
fi

# Check node_modules
echo -e "${BLUE}[3/5]${NC} Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}!${NC} Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Dependencies installed successfully"
    else
        echo -e "${RED}✗${NC} Failed to install dependencies"
        exit 1
    fi
fi

# Check for game file
echo -e "${BLUE}[4/5]${NC} Checking game files..."
if [ -f "public/game.html" ] || [ -f "public/catpunk-chaos.html" ]; then
    echo -e "${GREEN}✓${NC} Game file found"
    
    # Copy catpunk-chaos.html to game.html if needed
    if [ -f "catpunk-chaos.html" ] && [ ! -f "public/game.html" ]; then
        echo -e "${YELLOW}!${NC} Copying catpunk-chaos.html to public/game.html..."
        cp catpunk-chaos.html public/game.html
    fi
else
    echo -e "${YELLOW}!${NC} Game file not found"
    echo "Looking for catpunk-chaos.html..."
    
    if [ -f "catpunk-chaos.html" ]; then
        mkdir -p public
        cp catpunk-chaos.html public/game.html
        echo -e "${GREEN}✓${NC} Copied catpunk-chaos.html to public/game.html"
    else
        echo -e "${RED}✗${NC} catpunk-chaos.html not found!"
        echo "Please ensure catpunk-chaos.html exists in the project root"
        exit 1
    fi
fi

# Check port availability
echo -e "${BLUE}[5/5]${NC} Checking port 3000..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}!${NC} Port 3000 is in use"
    echo ""
    read -p "Kill process on port 3000? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $(lsof -t -i:3000) 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Port 3000 freed"
    else
        echo -e "${YELLOW}!${NC} Using alternative port 3001"
        export PORT=3001
    fi
else
    echo -e "${GREEN}✓${NC} Port 3000 available"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}         All checks passed! 🎉${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

# Determine port
PORT=${PORT:-3000}

echo -e "${CYAN}📡 Server will start on port ${PORT}${NC}"
echo ""
echo -e "${YELLOW}🌐 URLs:${NC}"
echo -e "   Landing:  http://localhost:${PORT}/"
echo -e "   Game:     http://localhost:${PORT}/game.html"
echo ""
echo -e "${YELLOW}🎮 Controls:${NC}"
echo -e "   WASD - Move"
echo -e "   SPACE - Attack"
echo -e "   1-6 - Select weapon"
echo -e "   L - Leaderboard"
echo ""
echo -e "${PURPLE}Press Ctrl+C to stop the server${NC}"
echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

# Start server
if [ "$PORT" != "3000" ]; then
    PORT=$PORT npm start
else
    npm start
fi
