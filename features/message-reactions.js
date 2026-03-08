const REACTIONS = {
  love: ['❤', '😍', '🥰'],
  funny: ['😂', '🤣'],
  cute: ['🥹', '😊'],
  cool: ['🔥', '👍', '🤩'],
  sad: ['😢', '🫂'],
  wow: ['😮', '🤯'],
};

const PATTERNS = [
  { pattern: /\b(love|liebe|mag|adore)\b/i, category: 'love' },
  { pattern: /\b(cute|süß|niedlich|adorable|aww)\b/i, category: 'cute' },
  { pattern: /\b(funny|lustig|lol|haha|😂|🤣)\b/i, category: 'funny' },
  { pattern: /\b(cool|awesome|toll|super|mega|geil|krass)\b/i, category: 'cool' },
  { pattern: /\b(sad|traurig|schlecht|lonely|einsam|😢|😭)\b/i, category: 'sad' },
  { pattern: /\b(wow|whoa|omg|unglaublich|wahnsinn)\b/i, category: 'wow' },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  id: 'message_reactions',
  name: 'Message Reactions',
  description: 'Reacts to your messages with emoji',
  defaultEnabled: true,

  async onMessage(ctx) {
    if (!ctx.userText || !ctx.messageId) return;

    // ~30% chance to react even without a keyword match
    const shouldReactRandomly = Math.random() < 0.3;

    // Check for keyword matches
    let emoji = null;
    for (const { pattern, category } of PATTERNS) {
      if (pattern.test(ctx.userText)) {
        emoji = pickRandom(REACTIONS[category]);
        break;
      }
    }

    // Random reaction with a generic positive emoji
    if (!emoji && shouldReactRandomly) {
      emoji = pickRandom(['❤', '👍', '😊', '🤩', '🔥']);
    }

    if (!emoji) return;

    try {
      await ctx.setMessageReaction(ctx.botToken, ctx.chatId, ctx.messageId, emoji);
    } catch (err) {
      // Silently ignore — reactions may not be supported in all chats
    }
  },
};
