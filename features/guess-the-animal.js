const ANIMALS = [
  'cat', 'dog', 'rabbit', 'hamster', 'parrot', 'turtle', 'fish', 'horse',
  'duck', 'owl', 'penguin', 'koala', 'panda', 'fox', 'deer', 'hedgehog',
  'squirrel', 'frog', 'butterfly', 'dolphin', 'seal', 'otter', 'monkey',
  'elephant', 'giraffe', 'lion', 'tiger', 'bear', 'wolf', 'kangaroo',
  'flamingo', 'peacock', 'chameleon', 'sloth', 'raccoon', 'alpaca',
];

function pickWrongOptions(correctAnimal, count) {
  const others = ANIMALS.filter((a) => a.toLowerCase() !== correctAnimal.toLowerCase());
  const shuffled = others.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = {
  id: 'guess_the_animal',
  name: 'Guess the Animal',
  description: 'Sends a poll before the daily photo so you can guess the animal',
  defaultEnabled: true,

  promptAddition(data) {
    if (data.pendingGuess) {
      return 'GUESS THE ANIMAL FEATURE: A guessing poll is active — the user is ' +
        'deciding which animal is in today\'s photo. The photo will be sent once ' +
        'they vote. If they ask you to reveal it or skip, use the reveal_animal tool.';
    }
    return 'GUESS THE ANIMAL FEATURE: Before the daily photo, a poll is sent ' +
      'so the user can guess which animal is in the photo. This is handled automatically.';
  },

  tools(data) {
    if (!data.pendingGuess) return [];
    return [
      {
        type: 'function',
        function: {
          name: 'reveal_animal',
          description:
            'Reveal the daily photo when the user asks to skip the guess or see the answer. ' +
            'Use when they say things like "reveal", "zeig mal", "skip", "show me".',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
    ];
  },

  async handleTool(toolName, args, ctx) {
    if (toolName !== 'reveal_animal') return null;
    const data = ctx.loadFeatureData();
    if (!data.pendingGuess) return 'No guessing game is active right now.';

    await sendDelayedPhoto(data, ctx);
    return `The animal was: ${data.pendingGuess.animal}! Photo has been sent.`;
  },

  async beforePhoto(ctx) {
    const animal = ctx.animal || 'animal';
    try {
      const wrongOptions = pickWrongOptions(animal, 4);
      const options = shuffle([animal, ...wrongOptions]);
      const correctIndex = options.indexOf(animal);

      const result = await ctx.sendPoll(
        ctx.botToken,
        ctx.chatId,
        '🔎 Welches Tier ist auf dem heutigen Foto?',
        options
      );

      const pollId = result.result?.poll?.id;

      const data = ctx.loadFeatureData();
      data.pendingGuess = {
        animal,
        photoUrl: ctx.photoUrl,
        photoId: ctx.photoId,
        photoSource: ctx.photoSource,
        correctIndex,
        options,
        pollId,
      };
      ctx.saveFeatureData(data);
    } catch (err) {
      console.error('Guess the animal hook failed:', err.message);
    }
  },

  async onPollAnswer(ctx) {
    const data = ctx.loadFeatureData();
    if (!data.pendingGuess) return;
    if (data.pendingGuess.pollId !== ctx.pollId) return;

    const correct = ctx.optionIds.includes(data.pendingGuess.correctIndex);
    const animal = data.pendingGuess.animal;

    if (correct) {
      await ctx.sendMessage(
        ctx.botToken,
        ctx.chatId,
        `🎉 Richtig! Es ist ein ${animal}! Hier kommt dein Foto! 📸`
      );
    } else {
      const guessed = data.pendingGuess.options[ctx.optionIds[0]] || '?';
      await ctx.sendMessage(
        ctx.botToken,
        ctx.chatId,
        `😄 Nah dran! Du hast ${guessed} geraten, aber es ist ein ${animal}! Hier ist das Foto! 📸`
      );
    }

    await sendDelayedPhoto(data, ctx);
  },
};

async function sendDelayedPhoto(data, ctx) {
  const guess = data.pendingGuess;
  if (!guess) return;

  await ctx.sendPhoto(ctx.botToken, ctx.chatId, guess.photoUrl, '');

  // Record in photo history
  if (ctx.recordSent) {
    ctx.recordSent({ id: guess.photoId, source: guess.photoSource });
  }

  data.pendingGuess = null;
  ctx.saveFeatureData(data);

  // Run afterPhoto hooks
  if (ctx.runAfterPhoto) {
    await ctx.runAfterPhoto(guess.animal);
  }
}
