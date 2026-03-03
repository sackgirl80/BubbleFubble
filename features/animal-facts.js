module.exports = {
  id: 'animal_facts',
  name: 'Animal Facts',
  description: 'Sends a fun animal fact after each photo',
  defaultEnabled: true,
  promptAddition:
    'ANIMAL FACTS FEATURE: When you send a photo (via the send_photo tool), ' +
    'the system will automatically follow up with a fun animal fact. You do not ' +
    'need to include facts in your own replies.',

  async afterPhoto(ctx) {
    try {
      const animal = ctx.animal || 'animal';
      const fact = await ctx.generateText(
        `Generate a single short, fun, and surprising fact about a ${animal}, suitable for a 12-year-old. ` +
        'Reply with ONLY the fact, nothing else. Write in German. Add one relevant emoji at the end.'
      );
      if (fact) {
        await ctx.sendMessage(ctx.botToken, ctx.chatId, `💡 ${fact}`);
      }
    } catch (err) {
      console.error('Animal facts hook failed:', err.message);
    }
  },
};
