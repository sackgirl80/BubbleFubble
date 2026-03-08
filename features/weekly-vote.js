module.exports = {
  id: 'weekly_vote',
  name: 'Photo of the Week',
  description: 'Sends a poll every Sunday to vote on the best photo of the week',
  defaultEnabled: true,

  async onDaily(ctx) {
    const now = new Date();
    // Only run on Sundays
    if (now.getDay() !== 0) return;

    try {
      const history = ctx.loadPhotoHistory();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weekPhotos = history.sent.filter(
        (p) => new Date(p.sentAt) >= oneWeekAgo
      );

      if (weekPhotos.length < 2) return;

      // Take up to 10 photos (Telegram poll limit)
      const photos = weekPhotos.slice(-10);
      const options = photos.map((p, i) => {
        const day = new Date(p.sentAt).toLocaleDateString('de-DE', {
          weekday: 'short',
        });
        const source = p.source === 'pexels' ? '📷' : p.source === 'catapi' ? '🐱' : '🐶';
        return `${source} Foto ${i + 1} (${day})`;
      });

      await ctx.sendPoll(
        ctx.botToken,
        ctx.chatId,
        '🏆 Welches Foto war diese Woche dein Lieblingsfoto?',
        options
      );
    } catch (err) {
      console.error('Weekly vote hook failed:', err.message);
    }
  },
};
