module.exports = {
  id: 'quiz',
  name: 'Daily Quiz',
  description: 'Sends an animal quiz question with the daily photo',
  defaultEnabled: true,

  promptAddition:
    'QUIZ FEATURE: A multiple-choice animal quiz is sent with the daily photo. ' +
    'The quiz uses a Telegram poll so the user answers by tapping an option. ' +
    'If the user talks about the quiz, be encouraging and fun about it.',

  async onDaily(ctx) {
    try {
      const response = await ctx.generateText(
        'Generate a fun animal trivia multiple-choice quiz question for a 12-year-old. ' +
        'Format your response as exactly 5 lines:\n' +
        'Q: [the question in German]\n' +
        'A: [correct answer]\n' +
        'B: [wrong answer]\n' +
        'C: [wrong answer]\n' +
        'D: [wrong answer]\n' +
        'Make it fun and not too hard. All answers should be plausible.'
      );
      if (!response) return;

      const lines = response.split('\n').filter((l) => l.trim());
      const qLine = lines.find((l) => l.startsWith('Q:'));
      const aLine = lines.find((l) => l.startsWith('A:'));
      const bLine = lines.find((l) => l.startsWith('B:'));
      const cLine = lines.find((l) => l.startsWith('C:'));
      const dLine = lines.find((l) => l.startsWith('D:'));
      if (!qLine || !aLine || !bLine || !cLine || !dLine) return;

      const question = qLine.replace('Q:', '').trim();
      const options = [
        aLine.replace('A:', '').trim(),
        bLine.replace('B:', '').trim(),
        cLine.replace('C:', '').trim(),
        dLine.replace('D:', '').trim(),
      ];

      // Shuffle options so the correct answer isn't always first
      const correctAnswer = options[0];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      const correctIndex = options.indexOf(correctAnswer);

      await ctx.sendQuiz(
        ctx.botToken,
        ctx.chatId,
        `🧠 ${question}`,
        options,
        correctIndex
      );
    } catch (err) {
      console.error('Quiz hook failed:', err.message);
    }
  },
};
