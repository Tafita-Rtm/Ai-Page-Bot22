const { callGeminiAPI } = require('../utils/callGeminiAPI');

module.exports = {
  name: 'ai',
  description: 'Pose une question à plusieurs services AI et obtient la réponse la plus rapide.',
  author: 'ChatGPT',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    try {
      // Message pour indiquer que Gemini est en train de répondre
      const waitingMessage = {
        text: '💬 multyAi est en train de te répondre⏳...\n\n─────★─────'
      };
      await sendMessage(senderId, waitingMessage, pageAccessToken);

      // Appel à l'API Gemini
      const response = await callGeminiAPI(prompt);

      // Créer un style avec un contour pour la réponse de Gemini
      const formattedResponse = `─────★─────\n` +
                                `✨ multy Ai 🤖🇲🇬\n\n${response}\n` +
                                `─────★─────`;

      // Gérer les réponses de plus de 2000 caractères
      const maxMessageLength = 2000;
      if (formattedResponse.length > maxMessageLength) {
        const messages = splitMessageIntoChunks(formattedResponse, maxMessageLength);
        for (const message of messages) {
          await sendMessage(senderId, { text: message }, pageAccessToken);
        }
      } else {
        await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      await sendMessage(senderId, { text: 'Une erreur est survenue.' }, pageAccessToken);
    }
  }
};

// Fonction pour découper les messages en morceaux de 2000 caractères
function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  return chunks;
}
