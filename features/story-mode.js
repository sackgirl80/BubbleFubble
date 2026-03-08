module.exports = {
  id: 'story_mode',
  name: 'Story Mode',
  description: 'A continuing adventure story featuring all your named animals',
  defaultEnabled: true,

  promptAddition(data) {
    const chapterCount = (data.chapters || []).length;
    if (chapterCount === 0) {
      return 'STORY MODE FEATURE: A daily adventure story will begin once ' +
        'animals have been named. Each day a new chapter features the latest animal.';
    }
    return `STORY MODE FEATURE: There is an ongoing adventure story with ${chapterCount} ` +
      'chapters so far. A new chapter is added each day featuring the latest named animal. ' +
      'If the user asks about the story, tell them about the latest chapter.';
  },

  async onDaily(ctx) {
    // Get named animals from the name_the_animal feature
    const nameData = ctx.getFeatureData('name_the_animal');
    const names = nameData.names || {};
    const entries = Object.entries(names);
    if (entries.length === 0) return;

    const data = ctx.loadFeatureData();
    if (!data.chapters) data.chapters = [];

    // Get the latest named animal
    const latestName = entries[entries.length - 1][1];

    // Get all animal names for context
    const allNames = entries.map(([, name]) => name);
    const previousChapters = data.chapters.slice(-3).join('\n---\n');

    try {
      const chapter = await ctx.generateText(
        `Write a short adventure story chapter (3-5 sentences) in German. ` +
        `The main character joining today is "${latestName}". ` +
        `Other characters in the story: ${allNames.join(', ')}. ` +
        (previousChapters
          ? `Previous chapters for context:\n${previousChapters}\n\nContinue the story.`
          : 'This is Chapter 1 — start an exciting adventure!') +
        ' Be fun, age-appropriate for a 12-year-old, and end with a small cliffhanger. ' +
        'Start with "📖 Kapitel ' + (data.chapters.length + 1) + ':" and reply with ONLY the chapter.'
      );

      if (chapter) {
        await ctx.sendMessage(ctx.botToken, ctx.chatId, chapter);
        data.chapters.push(chapter);
        // Keep only last 20 chapters to avoid data bloat
        if (data.chapters.length > 20) {
          data.chapters = data.chapters.slice(-20);
        }
        ctx.saveFeatureData(data);
      }
    } catch (err) {
      console.error('Story mode hook failed:', err.message);
    }
  },
};
