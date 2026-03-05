module.exports = {
  id: 'trading_cards',
  name: 'Animal Trading Cards',
  description: 'Generates collectible stats cards for each animal photo',
  defaultEnabled: true,

  promptAddition:
    'TRADING CARDS FEATURE: After a photo is sent, the system will automatically ' +
    'generate a trading card with fun stats for the animal. This is handled ' +
    'automatically — you do not need to generate stats yourself.',

  async afterPhoto(ctx) {
    const animal = ctx.animal || 'animal';
    try {
      const card = await ctx.generateText(
        `Generate a fun collectible trading card for a ${animal}. ` +
        'Use this exact format with emoji bars (1-5 filled blocks out of 5):\n\n' +
        '🃏 TRADING CARD\n' +
        'Type: [animal type]\n' +
        'Cuteness: [emoji bar] [X/5]\n' +
        'Fluffiness: [emoji bar] [X/5]\n' +
        'Speed: [emoji bar] [X/5]\n' +
        'Mischief: [emoji bar] [X/5]\n' +
        'Cuddle Factor: [emoji bar] [X/5]\n' +
        'Special Ability: [one fun made-up ability]\n\n' +
        'Use 🟩 for filled and ⬜ for empty in the bars. ' +
        'Write in German. Be creative and funny with the special ability. ' +
        'Reply with ONLY the card, nothing else.'
      );
      if (card) {
        await ctx.sendMessage(ctx.botToken, ctx.chatId, card);
      }
    } catch (err) {
      console.error('Trading cards hook failed:', err.message);
    }
  },
};
