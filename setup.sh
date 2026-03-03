#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== BubbleFubble Setup ==="

# 1. Install dependencies
echo "Installing npm dependencies..."
npm install

# 2. Create logs directory
mkdir -p logs

# 3. Create launchd plist
PLIST_LABEL="com.bubblefubble.daily-animal-photo"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
NODE_PATH="$(which node)"
SCRIPT_PATH="$SCRIPT_DIR/index.js"

cat > "$PLIST_PATH" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${SCRIPT_PATH}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>30</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${SCRIPT_DIR}/logs/bubblefubble.log</string>
    <key>StandardErrorPath</key>
    <string>${SCRIPT_DIR}/logs/bubblefubble-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
PLISTEOF

echo "Created daily photo plist at: $PLIST_PATH"

# 4. Create bot launchd plist (long-running chat responder)
BOT_LABEL="com.bubblefubble.bot"
BOT_PLIST_PATH="$HOME/Library/LaunchAgents/${BOT_LABEL}.plist"
BOT_SCRIPT_PATH="$SCRIPT_DIR/bot.js"

cat > "$BOT_PLIST_PATH" << BOTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${BOT_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${BOT_SCRIPT_PATH}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>StandardOutPath</key>
    <string>${SCRIPT_DIR}/logs/bot.log</string>
    <key>StandardErrorPath</key>
    <string>${SCRIPT_DIR}/logs/bot-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
BOTEOF

echo "Created bot plist at: $BOT_PLIST_PATH"

# 5. Load the plists
launchctl bootout gui/$(id -u) "$PLIST_PATH" 2>/dev/null || true
launchctl bootstrap gui/$(id -u) "$PLIST_PATH"
echo "Loaded daily photo agent (runs at 6:30 AM)."

launchctl bootout gui/$(id -u) "$BOT_PLIST_PATH" 2>/dev/null || true
launchctl bootstrap gui/$(id -u) "$BOT_PLIST_PATH"
echo "Loaded chat bot agent (runs continuously)."

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env with your bot token, chat ID, Pexels API key, and AI provider key"
echo "  2. Run 'node index.js' to test daily photo"
echo "  3. Run 'node bot.js' to test chat replies"
echo "  4. The daily photo runs at 6:30 AM; the chat bot runs continuously"
echo "  5. Check logs/ directory for output"
