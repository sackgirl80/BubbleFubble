# BubbleFubble

Send a random cute/funny animal photo via Telegram every day.

BubbleFubble picks a random animal picture from the internet (Pexels, The Cat API, or random.dog), sends it to a Telegram chat with a cheerful German caption, and keeps track of what it has sent so you never get the same photo twice.

If the recipient replies, BubbleFubble chats back using AI (Groq/Llama), responding in whatever language the recipient writes in.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- A Telegram account
- Free API keys (see below)

## Setup

### 1. Clone the repo

```bash
git clone git@github.com:sackgirl80/BubbleFubble.git
cd BubbleFubble
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a Telegram bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the prompts to create your bot
3. Copy the **bot token** you receive

### 4. Get free API keys

**Pexels** (animal photos):
1. Sign up at https://www.pexels.com/api/ (free, no credit card)
2. Copy your API key

**Groq** (chat replies):
1. Sign up at https://console.groq.com/keys (free)
2. Create an API key

### 5. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
PEXELS_API_KEY=your_pexels_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### 6. Get the recipient's chat ID

The recipient needs to open your bot in Telegram and send `/start`. Then run:

```bash
node get-chat-id.js
```

This prints the chat ID. Add it to `.env` as `TELEGRAM_CHAT_ID`.

### 7. Test the daily photo

```bash
node index.js
```

The recipient should receive a cute animal photo.

### 8. Test chat replies

```bash
node bot.js
```

Send a message to the bot from Telegram — it should reply using AI. Press `Ctrl+C` to stop.

## Schedule daily runs (macOS)

```bash
bash setup.sh
```

This installs two macOS launchd agents:
- **Daily photo** — runs at 6:30 AM (catches up after sleep)
- **Chat bot** — runs continuously, restarts if it crashes

To change the photo time, edit the `Hour` and `Minute` values in `setup.sh` before running it.

You can also run `node index.js` manually at any time for an extra photo.

### Check logs

```bash
cat logs/bubblefubble.log        # daily photo log
cat logs/bubblefubble-error.log
cat logs/bot.log                  # chat bot log
cat logs/bot-error.log
```

### Uninstall the schedule

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.bubblefubble.daily-animal-photo.plist
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.bubblefubble.bot.plist
rm ~/Library/LaunchAgents/com.bubblefubble.daily-animal-photo.plist
rm ~/Library/LaunchAgents/com.bubblefubble.bot.plist
```

## How it works

- **Image sources**: Pexels API (50% chance), The Cat API (25%), random.dog (25%). If one source fails, the others are tried as fallback.
- **Duplicate prevention**: Every sent photo ID is recorded in `sent-photos.json`. The script retries up to 10 times if it draws a duplicate.
- **Captions**: Random cheerful messages in German.
- **Chat replies**: The bot listens for incoming messages via Telegram long polling. Messages are sent to Groq (Llama 3.3 70B, free tier) with a short conversation history (last 20 messages) for context. Replies match the language the recipient writes in.
