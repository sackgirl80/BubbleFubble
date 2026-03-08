#!/bin/bash
set -e

# BubbleFubble — Pull latest changes and restart services
# Usage: bash deploy.sh

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "Deploying BubbleFubble..."

# Pull latest
git pull

# Install dependencies
npm install --production

# Run SQLite migration if needed (idempotent)
if [ -f "data/users.json" ] && [ ! -f "data/bubblefubble.db" ]; then
  echo "Running SQLite migration..."
  node migrate-to-sqlite.js
fi

# Restart services (detect platform)
if [ "$(uname)" = "Darwin" ]; then
  echo "Restarting macOS launchd agents..."
  launchctl kickstart -k "gui/$(id -u)/com.bubblefubble.bot" 2>/dev/null || true
elif command -v systemctl &>/dev/null; then
  echo "Restarting systemd services..."
  systemctl --user restart bubblefubble-bot.service
fi

echo "Deploy complete!"
