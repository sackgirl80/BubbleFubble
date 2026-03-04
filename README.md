# BubbleFubble

Send a random cute/funny animal photo via Telegram every day.

BubbleFubble picks a random animal picture from the internet (Pexels, The Cat API, or random.dog), sends it to a Telegram chat with a cheerful German caption, and keeps track of what it has sent so you never get the same photo twice.

If the recipient replies, BubbleFubble chats back using AI (Anthropic Claude or Groq Llama — your choice), responding in whatever language the recipient writes in.

## Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- A Telegram account
- API keys (see below)

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

### 4. Get API keys

**Pexels** (animal photos):
1. Sign up at https://www.pexels.com/api/ (free, no credit card)
2. Copy your API key

**AI provider** (chat replies) — choose one:

| Provider | Quality | Cost | Signup |
|----------|---------|------|--------|
| **Anthropic (Claude Haiku)** | Excellent | ~$0.001/message | https://console.anthropic.com/ |
| **Grok (xAI)** | Very good | $25 free credits on signup | https://console.x.ai/ |
| **Groq (Llama 3.3 70B)** | Good | Free (100K tokens/day) | https://console.groq.com/keys |

### 5. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values (leave `TELEGRAM_CHAT_ID` as-is for now — you'll set it in step 6):

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here          # ← set in step 6 below
PEXELS_API_KEY=your_pexels_api_key_here

# Choose your AI provider: "anthropic" (recommended), "grok", or "groq"
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
```

To use Grok (xAI) instead:
```
AI_PROVIDER=grok
GROK_API_KEY=your_key_here
```

To use Groq (Llama) instead:
```
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here
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

## Features

BubbleFubble has a pluggable feature system. Features can be enabled/disabled directly in the chat — just ask! Try saying "What features do you have?" or "Disable stickers".

| Feature | Description | Default |
|---------|-------------|---------|
| Animal Facts | Sends a fun animal fact after each photo | On |
| Daily Quiz | Sends an animal trivia question with the daily photo | On |
| Time-based Mood | Adjusts tone based on time of day | On |
| Emoji Reactions | Occasionally adds extra cute emoji reactions | On |
| Photo of the Week | Sends a poll every Sunday to vote on the best photo | On |
| Mood Check-in | Occasionally asks how you're doing, cheers you up | On |
| Name the Animal | Asks you to name each animal and remembers the names | On |
| Birthday Countdown | Counts down to your birthday with a special message on the day | On |
| Credit Balance | Check remaining API credit balance (xAI/Grok) | On |

### Credit balance

The Credit Balance feature lets you ask the bot "How much credit do I have?" and it will check your prepaid balance live.

**Supported providers:**
- **Grok (xAI)** — shows prepaid credit balance
- **Groq** — free tier, no balance to check
- **Anthropic** — not yet supported (check manually at https://console.anthropic.com/)

**Setup (xAI/Grok):**

1. Go to https://console.x.ai/ → Settings → Management Keys
2. Create a new management key
3. Add to your `.env`:
   ```
   XAI_MANAGEMENT_KEY=your_management_key_here
   ```
   The team ID is auto-detected from your `GROK_API_KEY`. You can optionally set `XAI_TEAM_ID` to skip the auto-detection.

### Adding new features

Create a new file in `features/` that exports:

```js
module.exports = {
  id: 'my_feature',
  name: 'My Feature',
  description: 'What it does',
  defaultEnabled: true,
  promptAddition: 'Instructions for the AI when this feature is enabled.',
  tools: [],                          // Optional: extra AI tools
  async afterPhoto(ctx) {},           // Optional: runs after a photo is sent
  async onDaily(ctx) {},              // Optional: runs during daily photo
  async handleTool(name, args, ctx) {} // Optional: handle custom tool calls
};
```

The bot automatically loads all features from the `features/` directory on startup.

## How it works

- **Image sources**: Pexels API (50% chance), The Cat API (25%), random.dog (25%). If one source fails, the others are tried as fallback.
- **Duplicate prevention**: Every sent photo ID is recorded in `sent-photos.json`. The script retries up to 10 times if it draws a duplicate.
- **Captions**: Random cheerful messages in German.
- **Chat replies**: The bot listens for incoming messages via Telegram long polling. Messages are sent to your chosen AI provider (Anthropic Claude, xAI Grok, or Groq Llama) with conversation history for context (last 100 messages for Anthropic/Grok, 20 for Groq to stay within free tier limits). Replies match the language the recipient writes in.
- **Feature system**: Features are loaded from `features/` and can be toggled on/off via chat. Each feature can add to the AI's system prompt, provide additional tools, and hook into photo and daily events.
