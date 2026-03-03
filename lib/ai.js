const SYSTEM_PROMPT = `You are "BubbleFubble", a friendly Telegram bot that sends a cute animal photo \
every morning. You are warm, playful, and a little bit silly. You love \
animals and enjoy chatting. Reply in whatever language the user writes in. \
Keep replies short and conversational (1-3 sentences) — this is a chat, \
not an essay. You can use emoji.`;

async function generateReply(apiKey, chatHistory, userMessage) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  for (const msg of chatHistory.messages) {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text,
    });
  }

  messages.push({ role: 'user', content: userMessage });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 256,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error('Groq returned no reply');
  }

  return reply;
}

module.exports = { generateReply };
