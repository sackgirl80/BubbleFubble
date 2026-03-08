module.exports = {
  id: 'weekly_recap',
  name: 'Weekly Recap',
  description: 'Sends a Sunday summary of the week — animals, names, and highlights',
  defaultEnabled: true,

  async onDaily(ctx) {
    const now = new Date();
    // Only run on Sundays
    if (now.getDay() !== 0) return;

    try {
      const history = ctx.loadPhotoHistory();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekPhotos = history.sent.filter((p) => new Date(p.sentAt) >= oneWeekAgo);

      // Get named animals from this week
      const nameData = ctx.getFeatureData('name_the_animal');
      const names = nameData.names || {};
      const weekNames = Object.entries(names)
        .filter(([timestamp]) => new Date(timestamp) >= oneWeekAgo)
        .map(([, name]) => name);

      // Get streak data
      const streakData = ctx.getFeatureData('streak_tracker');
      const streak = streakData.currentStreak || 0;

      const photoCount = weekPhotos.length;
      const animalTypes = [...new Set(weekPhotos.map((p) => p.animal).filter(Boolean))];

      const summary = await ctx.generateText(
        'Write a fun weekly recap message in German for a 12-year-old. Use this data:\n' +
        `- Photos sent this week: ${photoCount}\n` +
        `- Animal types: ${animalTypes.length > 0 ? animalTypes.join(', ') : 'various'}\n` +
        `- Names given this week: ${weekNames.length > 0 ? weekNames.join(', ') : 'none'}\n` +
        `- Current chat streak: ${streak} days\n\n` +
        'Format it as a fun recap with emoji. Start with "📋 Wochenrückblick!" ' +
        'Keep it short (4-6 lines). End with something encouraging for next week. ' +
        'Reply with ONLY the recap.'
      );

      if (summary) {
        await ctx.sendMessage(ctx.botToken, ctx.chatId, summary);
      }
    } catch (err) {
      console.error('Weekly recap hook failed:', err.message);
    }
  },
};
