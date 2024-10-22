const axios = require('axios');
const { callGeminiAPI } = require('../utils/callGeminiAPI');

module.exports = {
  name: 'gpt4o',
  description: '📩 Utiliser Gemini ou GPT-4o selon le type de message (texte ou image).',
  author: 'ChatGPT',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    // Si l'utilisateur envoie une image (args vide dans ce cas)
    if (args.length === 0) {
      const repliedMessage = await fetchRepliedMessage(senderId, pageAccessToken); // Fonction simulée pour obtenir le message répondu
      if (repliedMessage && repliedMessage.attachments && repliedMessage.attachments[0].type === 'image') {
        const imageUrl = repliedMessage.attachments[0].url;
        const query = "Décris cette image.";
        await handleImage(senderId, imageUrl, query, sendMessage, pageAccessToken); // Utiliser la fonction pour gérer l'image
        return;
      }
    }

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

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
      console.error('Error calling Gemini API:', error);
      await sendMessage(senderId, { text: 'Une erreur est survenue.' }, pageAccessToken);
    }
  }
};

// Fonction pour gérer les images
async function handleImage(senderId, imageUrl, query, sendMessage, pageAccessToken) {
  try {
    const apiUrl = `https://deku-rest-apis.ooguy.com/gemini?prompt=${encodeURIComponent(query)}&url=${encodeURIComponent(imageUrl)}`;
    const { data } = await axios.get(apiUrl);
    const formattedResponse = `─────★─────\n` +
                              `✨GPT-4o 🤖🇲🇬\n\n${data.gemini}\n` +
                              `─────★─────`;

    await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
  } catch (error) {
    console.error('Error handling image:', error);
    await sendMessage(senderId, { text: "Désolé, je n'ai pas pu analyser l'image." }, pageAccessToken);
  }
}

// Fonction pour découper les messages en morceaux de 2000 caractères
function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  return chunks;
}

// Fonction simulée pour obtenir le message répondu
async function fetchRepliedMessage(senderId, pageAccessToken) {
  // Cette fonction est supposée retourner le dernier message de l'utilisateur avec un attachement (comme une image)
  // Simulez une réponse comme si vous récupériez le message de l'utilisateur
  return {
    attachments: [
      {
        type: 'image',
        url: 'https://exemple.com/image.jpg'
      }
    ]
  };
}
