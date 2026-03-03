const BASE_PROMPT = `You are "BubbleFubble", a friendly Telegram bot that sends a cute animal photo \
every morning. You are warm, playful, and a little bit silly. You love \
animals and enjoy chatting. Keep replies short and conversational \
(1-3 sentences) — this is a chat, not an essay. You can use emoji. \
LANGUAGE RULE: You MUST reply in the SAME language as the user's CURRENT \
message. If they write in English, reply ONLY in English. If they write in \
German, reply ONLY in German. Never mix languages. Ignore the language of \
previous messages — only match the current one. \
CRITICAL PHOTO RULE: NEVER use the send_photo tool unless the user EXPLICITLY \
asks for a photo/picture/image/Bild in their current message. Phrases like \
"send me a photo", "show me a picture", "schick mir ein Bild" are explicit \
requests. Everything else is NOT a photo request — just reply with text. \
When in doubt, reply with text, not a photo.`;

const BASE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'send_photo',
      description:
        'Send a new random cute animal photo. ONLY use this when the user explicitly requests a photo/picture/image/Bild. Do NOT use for general conversation.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_features',
      description:
        'List all available features with their enabled/disabled status. Use when the user asks about features, settings, or what you can do.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_feature',
      description:
        'Enable or disable a feature. Use when the user asks to turn a feature on or off.',
      parameters: {
        type: 'object',
        properties: {
          feature_id: {
            type: 'string',
            description: 'The ID of the feature to toggle',
          },
        },
        required: ['feature_id'],
      },
    },
  },
];

async function generateReply(apiKey, chatHistory, userMessage, systemPrompt, tools) {
  const prompt = systemPrompt || BASE_PROMPT;
  const toolList = tools || BASE_TOOLS;

  const messages = [{ role: 'system', content: prompt }];

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
      tools: toolList,
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
  if (toolCalls && toolCalls.length > 0) {
    const tc = toolCalls[0];
    const toolName = tc.function?.name;
    let args = {};
    try {
      args = JSON.parse(tc.function?.arguments || '{}');
    } catch {}
    return { type: 'tool_call', toolName, args };
  }

  const reply = choice.message?.content;
  if (!reply) {
    throw new Error('Groq returned no reply');
  }

  return { type: 'text', text: reply };
}

async function generateText(apiKey, prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 256,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

module.exports = { generateReply, generateText, BASE_PROMPT, BASE_TOOLS };
