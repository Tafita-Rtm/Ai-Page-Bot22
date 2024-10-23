const axios = require('axios');
const { callGeminiAPI } = require('../utils/callGeminiAPI');

module.exports = {
  name: 'gpt4o',
  description: '📩 Utiliser Gemini pour texte et image',
  author: 'ChatGPT',

  // Fonction pour gérer les textes
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    try {
      // Message pour indiquer que Gemini est en train de répondre
      const waitingMessage = {
        text: '💬 *Gemini est en train de te répondre* ⏳...\n\n─────★─────'
      };
      await sendMessage(senderId, waitingMessage, pageAccessToken);

      // Appel à l'API Gemini pour le texte
      const response = await callGeminiAPI(prompt);

      // Créer un style avec un contour pour la réponse de Gemini
      const formattedResponse = `─────★─────\n` +
                                `✨ Gemini 🤖🇲🇬\n\n${response}\n` +
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
      console.error('Erreur lors de l\'appel à Gemini API:', error);
      await sendMessage(senderId, { text: 'Une erreur est survenue.' }, pageAccessToken);
    }
  },

  // Fonction pour gérer les images
  async handleImage(senderId, imageUrl, sendMessage, pageAccessToken) {
    try {
      // Décrire l'image avec GPT-4o
      const query = "Décris cette image.";
      const apiUrl = `https://deku-rest-apis.ooguy.com/gemini?prompt=${encodeURIComponent(query)}&url=${encodeURIComponent(imageUrl)}`;
      const { data } = await axios.get(apiUrl);

      const formattedResponse = `─────★─────\n` +
                                `✨GPT-4o 🤖🇲🇬 (Analyse d'image)\n\n${data.gemini}\n` +
                                `─────★─────`;

      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
    } catch (error) {
      console.error('Erreur lors de l\'analyse de l\'image:', error);
      await sendMessage(senderId, { text: "Désolé, je n'ai pas pu analyser l'image." }, pageAccessToken);
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
