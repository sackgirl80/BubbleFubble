async function sendPhoto(botToken, chatId, imageUrl, caption) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: imageUrl,
      caption: caption || '',
    }),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || res.status}`);
  }

  return data;
}

async function getUpdates(botToken) {
  const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || res.status}`);
  }

  return data.result;
}

async function sendMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || res.status}`);
  }

  return data;
}

async function getUpdatesLongPoll(botToken, offset, timeout = 30) {
  const params = new URLSearchParams({ timeout: String(timeout) });
  if (offset !== undefined) {
    params.set('offset', String(offset));
  }

  const url = `https://api.telegram.org/bot${botToken}/getUpdates?${params}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout((timeout + 10) * 1000),
  });
  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || res.status}`);
  }

  return data.result;
}

async function sendPoll(botToken, chatId, question, options) {
  const url = `https://api.telegram.org/bot${botToken}/sendPoll`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      question,
      options: options.map((o) => ({ text: o })),
      is_anonymous: false,
    }),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || res.status}`);
  }

  return data;
}

async function sendQuiz(botToken, chatId, question, options, correctIndex) {
  const url = `https://api.telegram.org/bot${botToken}/sendPoll`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      question,
      options: options.map((o) => ({ text: o })),
      type: 'quiz',
      correct_option_id: correctIndex,
      is_anonymous: false,
    }),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || res.status}`);
  }

  return data;
}

module.exports = { sendPhoto, sendMessage, sendPoll, sendQuiz, getUpdates, getUpdatesLongPoll };
