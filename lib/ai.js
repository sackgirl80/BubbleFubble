const SYSTEM_PROMPT = `You are "BubbleFubble", a friendly Telegram bot that sends a cute animal photo \
every morning. You are warm, playful, and a little bit silly. You love \
animals and enjoy chatting. Keep replies short and conversational \
(1-3 sentences) — this is a chat, not an essay. You can use emoji. \
LANGUAGE RULE: You MUST reply in the SAME language as the user's CURRENT \
message. If they write in English, reply ONLY in English. If they write in \
German, reply ONLY in German. Never mix languages. Ignore the language of \
previous messages — only match the current one. \
PHOTO RULE: For most messages, just reply with text. Only use the send_photo \
tool when the user EXPLICITLY asks you to send/show them a photo, picture, \
image, or Bild. Do NOT use it for general conversation.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'send_photo',
      description:
        'Send a new random cute animal photo. ONLY use this when the user explicitly requests a photo/picture/image/Bild. Do NOT use for general conversation.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

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
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 256,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  if (!choice) {
    throw new Error('Groq returned no choices');
  }

  const toolCalls = choice.message?.tool_calls;
  if (toolCalls?.some((tc) => tc.function?.name === 'send_photo')) {
    return { type: 'send_photo' };
  }

  const reply = choice.message?.content;
  if (!reply) {
    throw new Error('Groq returned no reply');
  }

  return { type: 'text', text: reply };
}

module.exports = { generateReply };
