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
When in doubt, reply with text, not a photo. \
MEMORY RULE: The ENABLED FEATURES section below contains facts you know about \
the user (birthday, animal names, etc). This is your memory — always use it \
when the user asks what you know about them. Animal names (from the Name the \
Animal feature) are names the user gave to animals in photos — they are NOT \
the user's own name. Never confuse animal names with the user's name.`;

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
        'List all available features with their enabled/disabled status. ONLY use when the user specifically asks about features or settings (e.g. "list features", "what features do you have", "Welche Features hast du"). Do NOT use for general questions like "what do you know about me" — answer those from conversation context and memory instead.',
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

// --- Provider: Anthropic (Claude) ---

async function anthropicReply(apiKey, messages, systemPrompt, tools, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      system: systemPrompt,
      messages,
      tools: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      })),
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const toolBlock = data.content?.find((b) => b.type === 'tool_use');
  if (toolBlock) {
    return { type: 'tool_call', toolName: toolBlock.name, args: toolBlock.input || {} };
  }
  const textBlock = data.content?.find((b) => b.type === 'text');
  return { type: 'text', text: textBlock?.text || '' };
}

async function anthropicText(apiKey, prompt, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.find((b) => b.type === 'text')?.text || null;
}

// --- Provider: Groq (Llama) ---

async function groqReply(apiKey, messages, systemPrompt, tools, maxTokens) {
  const allMessages = [{ role: 'system', content: systemPrompt }, ...messages];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: allMessages,
      tools,
      tool_choice: 'auto',
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error('Groq returned no choices');

  const toolCalls = choice.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const tc = toolCalls[0];
    let args = {};
    try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}
    return { type: 'tool_call', toolName: tc.function?.name, args };
  }

  return { type: 'text', text: choice.message?.content || '' };
}

async function groqText(apiKey, prompt, maxTokens) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

// --- Public API ---

function getProvider() {
  return (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
}

function getApiKey() {
  const provider = getProvider();
  if (provider === 'groq') return process.env.GROQ_API_KEY;
  return process.env.ANTHROPIC_API_KEY;
}

function getMaxHistory() {
  const provider = getProvider();
  return provider === 'groq' ? 20 : 100;
}

async function generateReply(apiKey, chatHistory, userMessage, systemPrompt, tools) {
  const prompt = systemPrompt || BASE_PROMPT;
  const toolList = tools || BASE_TOOLS;

  const maxHistory = getMaxHistory();
  const recentMessages = chatHistory.messages.slice(-maxHistory);

  const messages = [];
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text,
    });
  }
  messages.push({ role: 'user', content: userMessage });

  const provider = getProvider();
  if (provider === 'groq') {
    return groqReply(apiKey, messages, prompt, toolList, 256);
  }
  return anthropicReply(apiKey, messages, prompt, toolList, 512);
}

async function generateText(apiKey, prompt) {
  const provider = getProvider();
  if (provider === 'groq') {
    return groqText(apiKey, prompt, 256);
  }
  return anthropicText(apiKey, prompt, 256);
}

module.exports = { generateReply, generateText, getApiKey, getProvider, BASE_PROMPT, BASE_TOOLS };
