module.exports = {
  id: 'streak_tracker',
  name: 'Chat Streak',
  description: 'Tracks consecutive days you chat and celebrates milestones',
  defaultEnabled: true,

  promptAddition(data) {
    const streak = data.currentStreak || 0;
    if (streak === 0) {
      return 'STREAK FEATURE: The user has no active chat streak yet. ' +
        'If they ask about their streak, tell them to keep chatting daily to build one!';
    }
    return `STREAK FEATURE: The user has a ${streak}-day chat streak! ` +
      `Their best streak ever is ${data.bestStreak || streak} days. ` +
      'Occasionally mention their streak in a fun, encouraging way (not every message). ' +
      'Celebrate milestone numbers (7, 14, 30, 50, 100).';
  },

  async onMessage(ctx) {
    const data = ctx.loadFeatureData();
    const today = new Date().toISOString().slice(0, 10);

    if (data.lastChatDate === today) return; // Already recorded today

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (data.lastChatDate === yesterday) {
      // Streak continues
      data.currentStreak = (data.currentStreak || 0) + 1;
    } else if (!data.lastChatDate) {
      // First ever message
      data.currentStreak = 1;
    } else {
      // Streak broken
      data.previousStreak = data.currentStreak || 0;
      data.currentStreak = 1;
    }

    data.bestStreak = Math.max(data.bestStreak || 0, data.currentStreak);
    data.lastChatDate = today;
    ctx.saveFeatureData(data);
  },

  async onDaily(ctx) {
    const data = ctx.loadFeatureData();
    if (!data.currentStreak) return;

    const milestones = [7, 14, 30, 50, 100, 200, 365];
    if (milestones.includes(data.currentStreak)) {
      await ctx.sendMessage(
        ctx.botToken,
        ctx.chatId,
        `🔥 Wow, ${data.currentStreak}-Tage-Streak! Du bist unglaublich! Weiter so! 🎉`
      );
    }

    // Tease if streak was broken yesterday
    if (data.previousStreak && data.previousStreak > 3 && data.currentStreak === 1) {
      await ctx.sendMessage(
        ctx.botToken,
        ctx.chatId,
        `😢 Dein ${data.previousStreak}-Tage-Streak ist leider vorbei... Aber heute starten wir neu! 💪`
      );
      data.previousStreak = 0;
      ctx.saveFeatureData(data);
    }
  },
};
