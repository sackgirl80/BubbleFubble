module.exports = {
  id: 'mood_checkin',
  name: 'Mood Check-in',
  description: 'Occasionally asks how you are doing and cheers you up with photos',
  defaultEnabled: true,
  promptAddition:
    'MOOD CHECK-IN FEATURE: Every 5-10 messages or so (not every message!), ' +
    'gently ask how the user is feeling. Be natural about it, weave it into ' +
    'the conversation. If they seem sad, down, or are having a bad day, be ' +
    'extra supportive and offer to send a cute photo to cheer them up ' +
    '(use the send_photo tool). Never be pushy about this.',
};
