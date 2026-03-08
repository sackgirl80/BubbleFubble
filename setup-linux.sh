#!/bin/bash
set -e

# BubbleFubble — Linux systemd setup
# Installs two user services: bot (continuous) + daily photo (timer)

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_PATH="$(which node)"
SERVICE_DIR="$HOME/.config/systemd/user"

echo "BubbleFubble Linux Setup"
echo "========================"
echo "App directory: $APP_DIR"
echo "Node.js: $NODE_PATH"
echo ""

# Create logs directory
mkdir -p "$APP_DIR/logs"

# Create systemd user directory
mkdir -p "$SERVICE_DIR"

# --- Chat bot service (runs continuously) ---
cat > "$SERVICE_DIR/bubblefubble-bot.service" << EOF
[Unit]
Description=BubbleFubble Chat Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$NODE_PATH bot.js
Restart=always
RestartSec=10
StandardOutput=append:$APP_DIR/logs/bot.log
StandardError=append:$APP_DIR/logs/bot-error.log

[Install]
WantedBy=default.target
EOF

# --- Daily photo service ---
cat > "$SERVICE_DIR/bubblefubble-daily.service" << EOF
[Unit]
Description=BubbleFubble Daily Photo
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=$NODE_PATH index.js
StandardOutput=append:$APP_DIR/logs/bubblefubble.log
StandardError=append:$APP_DIR/logs/bubblefubble-error.log
EOF

# --- Daily photo timer (6:30 AM) ---
cat > "$SERVICE_DIR/bubblefubble-daily.timer" << EOF
[Unit]
Description=BubbleFubble Daily Photo Timer

[Timer]
OnCalendar=*-*-* 06:30:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Reload systemd
systemctl --user daemon-reload

# Enable and start services
systemctl --user enable bubblefubble-bot.service
systemctl --user start bubblefubble-bot.service

systemctl --user enable bubblefubble-daily.timer
systemctl --user start bubblefubble-daily.timer

# Enable lingering so services run even when not logged in
loginctl enable-linger "$USER" 2>/dev/null || true

echo ""
echo "Done! Services installed and started."
echo ""
echo "Useful commands:"
echo "  systemctl --user status bubblefubble-bot      # check bot status"
echo "  systemctl --user restart bubblefubble-bot      # restart bot"
echo "  journalctl --user -u bubblefubble-bot -f       # follow bot logs"
echo "  systemctl --user status bubblefubble-daily.timer  # check timer"
echo "  systemctl --user start bubblefubble-daily       # trigger daily photo now"
echo ""
echo "Logs:"
echo "  $APP_DIR/logs/bot.log"
echo "  $APP_DIR/logs/bubblefubble.log"
