const axios = require('axios');
const path = require('path');

module.exports = {
  name: '4o',
  description: 'Pose une question à GPT-4o websrapers(afaka mamaly ny zavatra mitranga ankehitriny).',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-4 est en train de répondre
      await sendMessage(senderId, { text: 'GPT-4o websearche en cours⏳...\n\n─────★─────' }, pageAccessToken);

      // Si le message auquel on répond contient une image
      if (args.length === 0) {
        const repliedMessage = await fetchRepliedMessage(senderId, pageAccessToken); // Fonction simulée pour obtenir le message répondu
        if (repliedMessage && repliedMessage.attachments && repliedMessage.attachments[0].type === 'image') {
          const imageUrl = repliedMessage.attachments[0].url;
          const query = "Décris cette image.";
          await handleImage(senderId, imageUrl, query, sendMessage, pageAccessToken);
          return;
        }
      }

      // URL pour appeler l'API GPT-4o avec une question
      const apiUrl = `https://deku-rest-apis.ooguy.com/api/gpt-4o?q=${encodeURIComponent(prompt)}&uid=100${senderId}`;
      const response = await axios.get(apiUrl);

      const text = response.data.result;

      // Créer un style avec un contour pour la réponse de GPT-4
      const formattedResponse = `─────★─────\n` +
                                `✨GPT-4o web scrapers🤖🇲🇬\n\n${text}\n` +
                                `─────★─────`;

      // Gérer les réponses longues de plus de 2000 caractères
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
      console.error('Error calling GPT-4 API:', error);
      // Message de réponse d'erreur
      await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
    }
  }
};

// Fonction pour gérer les images
async function handleImage(senderId, imageUrl, query, sendMessage, pageAccessToken) {
  try {
    const apiUrl = `https://deku-rest-apis.ooguy.com/gemini?prompt=${encodeURIComponent(query)}&url=${encodeURIComponent(imageUrl)}`;
    const { data } = await axios.get(apiUrl);
    const formattedResponse = `─────★─────\n` +
                              `✨GPT-4o🤖🇲🇬\n\n${data.gemini}\n` +
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
