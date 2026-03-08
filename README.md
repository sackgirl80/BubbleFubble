<p align="center">
  <img src="docs/banner.png" alt="BubbleFubble" width="700"/>
</p>

<p align="center">
  <a href="https://github.com/sackgirl80/BubbleFubble/actions"><img src="https://github.com/sackgirl80/BubbleFubble/actions/workflows/test.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/badge/dependencies-2-blue" alt="Dependencies">
  <img src="https://img.shields.io/badge/features-16-orange" alt="Features">
</p>

<p align="center">
  <b>A friendly Telegram companion that brightens your morning with cute animals!</b><br>
  Perfect for kids, families, or anyone who loves adorable animal photos.
</p>

---

## Try it now!

**No setup needed** — just open Telegram and search for **[@BubbleFubbleBot](https://t.me/BubbleFubbleBot)**, then send `/start`. You'll get a daily cute animal photo, games, and an AI friend to chat with. It's completely free!

Want to run your own instance instead? Keep reading.

---

## Meet BubbleFubble!

Imagine waking up every morning to a surprise cute animal photo — a sleepy koala, a fluffy bunny, or a goofy dog. That's BubbleFubble! But it's more than just photos...

**BubbleFubble chats with you!** Reply in any language and it talks back — playful, silly, and always kind. It remembers your name, your favourite animals, and even counts down to your birthday.

**It's packed with games and surprises:**
- Can you **guess the animal** before the photo is revealed?
- Collect **trading cards** with stats for every animal
- Follow an **adventure story** starring the animals you name
- Keep your **chat streak** alive — how many days in a row can you go?
- Learn to say "cat" in Japanese, Swahili, or Icelandic

> *"BubbleFubble was built by a parent for their kid — and it shows. Every feature is designed to make a child smile."*

**Completely free to run** — BubbleFubble works with [Groq](https://console.groq.com/keys), which provides open-source AI models at no cost. No subscriptions, no hidden fees, no credit card needed. Paid AI providers (Grok, Anthropic) are available as optional upgrades if you want them, but you absolutely don't need them.

## Quick Start

```bash
git clone git@github.com:sackgirl80/BubbleFubble.git
cd BubbleFubble
npm install
cp .env.example .env    # then fill in your keys (see Setup below)
node index.js            # send a test photo
node bot.js              # start chatting
```

## Setup

<details>
<summary><b>1. Create a Telegram bot</b></summary>

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the prompts
3. Copy the **bot token** you receive

</details>

<details>
<summary><b>2. Get API keys</b></summary>

**Pexels** (animal photos) — free, no credit card:
- Sign up at https://www.pexels.com/api/ and copy your API key

**AI provider** (chat replies) — choose one:

| Provider | Quality | Cost | Signup |
|:---------|:--------|:-----|:-------|
| **Groq** (Llama 3.3 70B) | Good | **Free forever** — no credit card | [console.groq.com](https://console.groq.com/keys) |
| **Grok** (xAI) | Very good | Paid (optional) | [console.x.ai](https://console.x.ai/) |
| **Anthropic** (Claude Haiku) | Excellent | Paid (optional) | [console.anthropic.com](https://console.anthropic.com/) |

> Groq is the recommended starting point — it's completely free and works great!

</details>

<details>
<summary><b>3. Configure your .env file</b></summary>

```bash
cp .env.example .env
```

Fill in your values:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here          # set in step 4
PEXELS_API_KEY=your_pexels_api_key_here

# Choose one AI provider:
AI_PROVIDER=grok                             # or "anthropic" or "groq"
GROK_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
# GROQ_API_KEY=your_key_here
```

</details>

<details>
<summary><b>4. Get the chat ID</b></summary>

The recipient opens your bot in Telegram and sends `/start`. Then run:

```bash
node get-chat-id.js
```

Copy the chat ID into `.env` as `TELEGRAM_CHAT_ID`.

</details>

<details>
<summary><b>5. Test it!</b></summary>

```bash
node index.js    # sends a cute animal photo
node bot.js      # starts the chat bot (Ctrl+C to stop)
```

</details>

## All the Fun Stuff

BubbleFubble comes with **15 features** — and you can turn any of them on or off just by asking! Say *"What features do you have?"* or *"Disable stickers"* right in the chat.

### Every Photo is an Adventure

| | Feature | What it does |
|:--|:--------|:-------------|
| 🔎 | **Guess the Animal** | A poll before each photo — can you guess the animal from 5 choices? |
| 🃏 | **Trading Cards** | Collectible stat cards for each animal (cuteness, fluffiness, speed...) |
| 💡 | **Animal Facts** | A fun, surprising animal fact after each photo |
| 🌍 | **Multilingual Vocab** | Learn what the animal is called in 5 different languages |
| 🐾 | **Name the Animal** | Give each animal a name — the bot remembers them all! |
| 🧠 | **Daily Quiz** | Animal trivia questions to test your knowledge |

### Keep Coming Back For More

| | Feature | What it does |
|:--|:--------|:-------------|
| 📖 | **Story Mode** | An ongoing adventure story starring all the animals you've named |
| 🔥 | **Chat Streak** | Tracks how many days in a row you've chatted — don't break the streak! |
| 📋 | **Weekly Recap** | Every Sunday: a summary of the week's animals, names, and highlights |
| 🏆 | **Photo of the Week** | Vote on your favourite photo every Sunday |
| 🎂 | **Birthday Countdown** | Counts down to your birthday with a special message on the day |

### A Friend Who Cares

| | Feature | What it does |
|:--|:--------|:-------------|
| 😊 | **Mood Check-in** | Occasionally asks how you're doing and cheers you up |
| 🌅 | **Time-based Mood** | The bot adjusts its tone based on the time of day |
| ✨ | **Emoji Reactions** | Extra cute emoji reactions sprinkled into messages |
| 💰 | **Credit Balance** | *Paid AI providers only* — ask the bot how much credit you have left |

### Credit balance

<details>
<summary>Setup for credit balance checking (optional — only for paid AI providers)</summary>

> **BubbleFubble works completely free** using [Groq](https://console.groq.com/keys), which runs open-source AI models (Llama 3.3 70B) at no cost. Paid providers like Grok and Anthropic are optional upgrades — you never need them. This feature only applies if you *choose* to use a paid provider.

The bot can check your xAI/Grok prepaid balance live. To enable:

1. Go to [console.x.ai](https://console.x.ai/) → Settings → Management Keys
2. Create a new management key
3. Add to `.env`:
   ```
   XAI_MANAGEMENT_KEY=your_management_key_here
   ```
   The team ID is auto-detected from your `GROK_API_KEY`.

</details>

## Schedule daily runs (macOS)

```bash
bash setup.sh
```

This installs two background services:
- **Daily photo** at 6:30 AM (catches up if your Mac was asleep)
- **Chat bot** runs continuously, auto-restarts if it crashes

<details>
<summary>Managing the schedule</summary>

**Change photo time:** Edit the `Hour` and `Minute` values in `setup.sh` before running it.

**Send an extra photo:** `node index.js`

**Restart the bot:** `launchctl kickstart -k gui/$(id -u)/com.bubblefubble.bot`

**Check logs:**
```bash
cat logs/bubblefubble.log        # daily photo
cat logs/bot.log                  # chat bot
```

**Uninstall:**
```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.bubblefubble.daily-animal-photo.plist
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.bubblefubble.bot.plist
rm ~/Library/LaunchAgents/com.bubblefubble.*.plist
```

</details>

## Schedule daily runs (Linux)

```bash
bash setup-linux.sh
```

This installs two systemd user services:
- **Chat bot** runs continuously, auto-restarts if it crashes
- **Daily photo** at 6:30 AM via systemd timer

<details>
<summary>Managing on Linux</summary>

**Check status:** `systemctl --user status bubblefubble-bot`

**Restart bot:** `systemctl --user restart bubblefubble-bot`

**Trigger daily photo now:** `systemctl --user start bubblefubble-daily`

**Follow logs:** `journalctl --user -u bubblefubble-bot -f`

**Deploy updates:** `bash deploy.sh`

**Uninstall:**
```bash
systemctl --user stop bubblefubble-bot bubblefubble-daily.timer
systemctl --user disable bubblefubble-bot bubblefubble-daily.timer
rm ~/.config/systemd/user/bubblefubble-*
systemctl --user daemon-reload
```

</details>

## Under the Hood

<details>
<summary>For the curious and the tinkerers</summary>

| | |
|:--|:--|
| **Photo sources** | Pexels (50%), The Cat API (25%), random.dog (25%) with automatic fallback |
| **No duplicates** | Every photo ID is tracked — you'll never see the same one twice |
| **AI chat** | Your choice of Anthropic Claude, xAI Grok, or Groq Llama |
| **Features** | Pluggable system — toggle on/off via chat, or build your own! |
| **Language** | The bot matches whatever language you write in |

### Build your own features

Create a file in `features/` and the bot picks it up automatically:

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

</details>

---

<p align="center">
  Made with love for daily smiles 🐾<br>
  <sub>Built by a parent, for a kid, with a lot of help from AI friends.</sub>
</p>
