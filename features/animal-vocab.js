module.exports = {
  id: 'animal_vocab',
  name: 'Multilingual Animal Vocab',
  description: 'Teaches you what each animal is called in different languages',
  defaultEnabled: true,

  promptAddition:
    'ANIMAL VOCAB FEATURE: After each photo, the system automatically sends ' +
    'a multilingual vocab message. This is handled automatically.',

  async afterPhoto(ctx) {
    const animal = ctx.animal || 'animal';
    try {
      const vocab = await ctx.generateText(
        `Teach a 12-year-old what a "${animal}" is called in 5 different languages. ` +
        'Pick interesting and varied languages (mix common ones like French/Spanish ' +
        'with fun ones like Japanese, Swahili, Icelandic, Turkish, Korean, etc). ' +
        'Vary the languages each time — do NOT always use the same ones.\n\n' +
        'Format as:\n' +
        '🌍 Tiername weltweit:\n' +
        '🇫🇷 French: [word]\n' +
        '🇯🇵 Japanese: [word]\n' +
        '... (5 languages total)\n\n' +
        'Use the correct flag emoji for each language. ' +
        'Reply with ONLY the vocab list.'
      );
      if (vocab) {
        await ctx.sendMessage(ctx.botToken, ctx.chatId, vocab);
      }
    } catch (err) {
      console.error('Animal vocab hook failed:', err.message);
    }
  },
};
