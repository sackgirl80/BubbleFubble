# BubbleFubble

Telegram bot that sends daily cute animal photos and chats using AI.

Public bot: [@BubbleFubbleBot](https://t.me/BubbleFubbleBot)
Website: https://sackgirl80.github.io/BubbleFubble/

## Commands

- `npm install` — install dependencies (`dotenv` + `better-sqlite3`)
- `npm test` — run unit tests (30 tests, no API calls needed)
- `npm start` — send one daily photo to all registered users
- `node bot.js` — start the chat bot (runs continuously)
- `node get-chat-id.js` — utility to find Telegram chat IDs
- `bash setup.sh` — install macOS launchd agents
- `bash setup-linux.sh` — install Linux systemd services
- `bash deploy.sh` — pull latest, install deps, restart services

## Architecture

- `index.js` — daily photo sender (run-once, scheduled)
- `bot.js` — chat bot (long-running, polls Telegram for messages)
- `lib/db.js` — SQLite database (WAL mode, data/bubblefubble.db)
- `lib/ai.js` — AI provider abstraction (Anthropic, Grok, Groq)
- `lib/feature-manager.js` — pluggable feature system (per-user config/data)
- `lib/users.js` — multi-user registry
- `lib/sources.js` — animal photo fetchers (Pexels, Cat API, random.dog)
- `lib/telegram.js` — Telegram Bot API wrapper
- `lib/history.js` — sent photo dedup tracking (per-user)
- `lib/chat-history.js` — conversation history persistence (per-user)
- `features/*.js` — individual feature plugins (16 features)

## Data Storage

- SQLite database: `data/bubblefubble.db`
- Tables: users, chat_history, sent_photos, feature_config, feature_data
- Migration scripts: `migrate-to-multiuser.js` (JSON dirs), `migrate-to-sqlite.js` (JSON → SQLite)

## Conventions

- Pure Node.js, no framework — uses built-in `fetch` (Node 20+)
- Dependencies: `dotenv`, `better-sqlite3`
- Tests use Node's built-in test runner (`node:test`)
- AI provider is configurable via `AI_PROVIDER` env var (global default, per-user override via /setkey)
- Multi-user: users register via /start, data isolated per chatId in SQLite
- Features are self-contained modules in `features/` with a standard interface
- Git identity for this repo: sackgirl80 <sackgirl80@gmail.com>
- Push via SSH alias `github-sackgirl80` (uses `~/.ssh/sackgirl80_ed25519`)
- GitHub PAT for API operations (PR reviews, merges): `ghp_HQSw...` (sackgirl80's token)

## Scheduling

### macOS (launchd)
- `com.bubblefubble.daily-animal-photo` — runs `index.js` at 6:30 AM
- `com.bubblefubble.bot` — runs `bot.js` continuously (KeepAlive)
- Restart bot: `launchctl kickstart -k gui/$(id -u)/com.bubblefubble.bot`

### Linux (systemd)
- `bubblefubble-bot.service` — runs `bot.js` continuously (Restart=always)
- `bubblefubble-daily.timer` — runs `index.js` at 6:30 AM
- Restart bot: `systemctl --user restart bubblefubble-bot`

### Logs
- `logs/bot.log`, `logs/bot-error.log` — chat bot
- `logs/bubblefubble.log`, `logs/bubblefubble-error.log` — daily photo
- `logs/issues.log` — error safety net (JSON lines)
