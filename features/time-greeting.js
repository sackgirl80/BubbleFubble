module.exports = {
  id: 'time_greeting',
  name: 'Time-based Mood',
  description: 'Adjusts tone based on time of day (cheerful morning, cozy evening)',
  defaultEnabled: true,

  promptAddition() {
    const hour = new Date().getHours();
    let timeContext;
    if (hour < 6) {
      timeContext = 'It is very early morning (before 6am). Be gentle and quiet.';
    } else if (hour < 10) {
      timeContext = 'It is morning. Be cheerful, energetic, and bright!';
    } else if (hour < 17) {
      timeContext = 'It is daytime. Be friendly and playful.';
    } else if (hour < 21) {
      timeContext = 'It is evening. Be warm and relaxed.';
    } else {
      timeContext = 'It is late night. Be cozy and calm. If the user says goodnight, wish them sweet dreams with sleepy animal emojis.';
    }
    return `TIME-BASED MOOD: ${timeContext}`;
  },
};
