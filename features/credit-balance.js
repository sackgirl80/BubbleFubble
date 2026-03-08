module.exports = {
  id: 'credit_balance',
  name: 'Credit Balance',
  description: 'Check remaining API credit balance',
  defaultEnabled: true,

  promptAddition:
    'CREDIT BALANCE FEATURE: When the user asks about their credit balance, ' +
    'remaining credit, how much credit they have left, Guthaben, or anything ' +
    'related to API credit or costs, use the check_credit tool. Do NOT try to ' +
    'answer from memory — always call the tool to get a live balance.',

  tools: [
    {
      type: 'function',
      function: {
        name: 'check_credit',
        description:
          'Check the remaining API credit balance for the current AI provider. ' +
          'Use when the user asks about credit, balance, Guthaben, or costs.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
  ],

  async handleTool(toolName, args, ctx) {
    if (toolName !== 'check_credit') return null;

    const provider = ctx.getProvider();

    if (provider === 'grok') {
      return await checkGrokBalance();
    }

    if (provider === 'groq') {
      return 'Credit check is not available for Groq (free tier). No balance to report.';
    }

    if (provider === 'anthropic') {
      return 'Credit check is not currently configured for Anthropic. ' +
        'Check your balance at https://console.anthropic.com/';
    }

    return `Credit check is not supported for provider "${provider}".`;
  },

  async onDaily(ctx) {
    const provider = ctx.getProvider();
    if (provider !== 'grok') return;

    try {
      const result = await checkGrokBalance();
      if (result) {
        await ctx.sendMessage(ctx.botToken, ctx.chatId, `💰 ${result}`);
      }
    } catch (err) {
      console.error('Credit balance daily hook failed:', err.message);
    }
  },
};

async function getTeamId() {
  // Use explicit env var if set, otherwise auto-detect from the API key
  if (process.env.XAI_TEAM_ID) return process.env.XAI_TEAM_ID;

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.x.ai/v1/api-key', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
  return data.team_id || null;
}

async function checkGrokBalance() {
  const managementKey = process.env.XAI_MANAGEMENT_KEY;

  if (!managementKey) {
    return 'xAI credit balance is not configured. Set XAI_MANAGEMENT_KEY in ' +
      'your .env file. See https://github.com/sackgirl80/BubbleFubble#credit-balance';
  }

  const teamId = await getTeamId();
  if (!teamId) {
    return 'Could not determine xAI team ID. Set XAI_TEAM_ID in your .env file ' +
      'or ensure GROK_API_KEY is configured.';
  }

  try {
    const url = `https://management-api.x.ai/v1/billing/teams/${teamId}/postpaid/invoice/preview`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${managementKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`xAI API ${res.status}: ${body}`);
    }

    const data = await res.json();
    const invoice = data.coreInvoice || {};
    const totalCents = Math.abs(Number(invoice.prepaidCredits?.val || 0));
    const usedCents = Math.abs(Number(invoice.prepaidCreditsUsed?.val || 0));
    const remainingCents = totalCents - usedCents;
    const remaining = (remainingCents / 100).toFixed(2);
    const total = (totalCents / 100).toFixed(2);
    const used = (usedCents / 100).toFixed(2);
    return `xAI (Grok) credit: $${remaining} remaining out of $${total} total ($${used} used)`;
  } catch (err) {
    return `Could not check xAI balance: ${err.message}`;
  }
}
