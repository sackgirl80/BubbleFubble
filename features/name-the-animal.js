module.exports = {
  id: 'name_the_animal',
  name: 'Name the Animal',
  description: 'Asks you to name each animal and remembers the names',
  defaultEnabled: true,

  promptAddition(data) {
    const names = data.names || {};
    const entries = Object.entries(names);
    let prompt =
      'NAME THE ANIMAL FEATURE: After a photo is sent, the system asks the user ' +
      'to name the animal. When the user gives a name, use the save_animal_name tool ' +
      'to remember it. Occasionally reference previously named animals in conversation.';
    if (entries.length > 0) {
      const recent = entries.slice(-10);
      const list = recent.map(([, name]) => name).join(', ');
      prompt += ` Previously named animals: ${list}.`;
    }
    return prompt;
  },

  tools: [
    {
      type: 'function',
      function: {
        name: 'save_animal_name',
        description:
          'Save the name the user gave to an animal from a photo. Use when the user names an animal.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name the user chose for the animal',
            },
          },
          required: ['name'],
        },
      },
    },
  ],

  async handleTool(toolName, args, ctx) {
    if (toolName !== 'save_animal_name') return null;
    const data = ctx.loadFeatureData();
    if (!data.names) data.names = {};
    data.names[new Date().toISOString()] = args.name;
    // Track the most recent animal type for context
    data.lastAnimal = ctx.animal || null;
    ctx.saveFeatureData(data);
    return `Saved name: ${args.name}`;
  },

  async afterPhoto(ctx) {
    const animal = ctx.animal || 'Tierchen';
    await ctx.sendMessage(
      ctx.botToken,
      ctx.chatId,
      `Wie würdest du diesen kleinen ${animal} nennen? 🐾`
    );
  },
};
