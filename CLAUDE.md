# BubbleFubble

Telegram bot that sends daily cute animal photos and chats using AI.

## Commands

- `npm install` — install dependencies (only `dotenv`)
- `npm test` — run unit tests (28 tests, no API calls needed)
- `npm start` — send one daily photo (runs via launchd at 6:30 AM)
- `node bot.js` — start the chat bot (runs continuously via launchd)
- `node get-chat-id.js` — utility to find Telegram chat IDs
- `bash setup.sh` — install macOS launchd agents

## Architecture

- `index.js` — daily photo sender (run-once, scheduled via launchd)
- `bot.js` — chat bot (long-running, polls Telegram for messages)
- `lib/ai.js` — AI provider abstraction (Anthropic, Grok, Groq)
- `lib/feature-manager.js` — pluggable feature system
- `lib/sources.js` — animal photo fetchers (Pexels, Cat API, random.dog)
- `lib/telegram.js` — Telegram Bot API wrapper
- `lib/history.js` — sent photo dedup tracking
- `lib/chat-history.js` — conversation history persistence
- `features/*.js` — individual feature plugins (8 features)

## Conventions

- Pure Node.js, no framework — uses built-in `fetch` (Node 20+)
- Only dependency is `dotenv`
- Tests use Node's built-in test runner (`node:test`)
- AI provider is configurable via `AI_PROVIDER` env var
- Features are self-contained modules in `features/` with a standard interface
- Git identity for this repo: sackgirl80 <sackgirl80@gmail.com>
- Push via SSH alias `github-sackgirl80` (uses `~/.ssh/sackgirl80_ed25519`)
- GitHub PAT for API operations (PR reviews, merges): `ghp_HQSw...` (sackgirl80's token)

## launchd agents

- `com.bubblefubble.daily-animal-photo` — runs `index.js` at 6:30 AM
- `com.bubblefubble.bot` — runs `bot.js` continuously (KeepAlive)
- Restart bot: `launchctl kickstart -k gui/$(id -u)/com.bubblefubble.bot`
- Logs: `logs/bubblefubble.log`, `logs/bot.log`, `logs/bot-error.log`
