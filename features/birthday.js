module.exports = {
  id: 'birthday',
  name: 'Birthday Countdown',
  description: 'Counts down to your birthday and sends something special on the day',
  defaultEnabled: true,

  promptAddition(data) {
    if (!data.date) {
      return (
        'BIRTHDAY FEATURE: The user has not set their birthday yet. ' +
        'If they mention their birthday, use the set_birthday tool to save it.'
      );
    }
    const today = new Date();
    const [month, day] = data.date.split('-').map(Number);
    let bday = new Date(today.getFullYear(), month - 1, day);
    if (bday < today) {
      bday = new Date(today.getFullYear() + 1, month - 1, day);
    }
    const diff = Math.ceil((bday - today) / (1000 * 60 * 60 * 24));

    if (diff === 0) {
      return 'BIRTHDAY FEATURE: TODAY IS THE USER\'S BIRTHDAY! 🎂🎉 Wish them a wonderful happy birthday! Be extra festive and excited!';
    }
    return (
      `BIRTHDAY FEATURE: The user's birthday is on ${data.date} (in ${diff} days). ` +
      'Occasionally (not every message) mention the countdown in a fun way.'
    );
  },

  tools: [
    {
      type: 'function',
      function: {
        name: 'set_birthday',
        description:
          'Save the user\'s birthday date. Use when they tell you their birthday.',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Birthday in MM-DD format (e.g. "03-15" for March 15)',
            },
          },
          required: ['date'],
        },
      },
    },
  ],

  async handleTool(toolName, args, ctx) {
    if (toolName !== 'set_birthday') return null;
    const data = ctx.loadFeatureData();
    data.date = args.date;
    ctx.saveFeatureData(data);
    return `Birthday saved: ${args.date}`;
  },

  async onDaily(ctx) {
    const data = ctx.loadFeatureData();
    if (!data.date) return;

    const today = new Date();
    const [month, day] = data.date.split('-').map(Number);
    if (today.getMonth() + 1 === month && today.getDate() === day) {
      await ctx.sendMessage(
        ctx.botToken,
        ctx.chatId,
        '🎂🎉🥳 ALLES GUTE ZUM GEBURTSTAG! 🎉🎂🥳\n\n' +
        'Heute ist dein besonderer Tag! Ich hoffe, du hast den allerbesten Geburtstag ' +
        'mit ganz viel Spaß, Kuchen und Liebe! 💕🎁🎈'
      );
    }
  },
};
