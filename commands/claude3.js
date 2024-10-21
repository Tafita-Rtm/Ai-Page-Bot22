const axios = require('axios');

module.exports = {
  name: 'ai2',
  description: 'Pose une question à GPT-4o avec support pour les images.',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-4 est en train de répondre
      await sendMessage(senderId, { text: 'GPT-4o en train de traiter ta requête⏳...\n\n─────★─────' }, pageAccessToken);

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

      // URL pour appeler l'API GPT-4o avec une question (basée sur la première URL)
      const apiUrl = `https://cadis.onrender.com/chat`;
      const data = { prompt, customId: senderId };
      const response = await axios.post(apiUrl, data);

      const text = response.data.message;

      // Créer un style avec un contour pour la réponse de GPT-4
      const formattedResponse = `─────★─────\n` +
                                `✨GPT-4o🤖🇲🇬\n\n${text}\n` +
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
      await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
    }
  }
};

// Fonction pour gérer les images
async function handleImage(senderId, imageUrl, query, sendMessage, pageAccessToken) {
  try {
    const apiUrl = `https://cadis.onrender.com/chat`;
    const data = { prompt: query, customId: senderId, link: imageUrl };
    const response = await axios.post(apiUrl, data);

    const formattedResponse = `─────★─────\n` +
                              `✨GPT-4o🤖🇲🇬\n\n${response.data.message}\n` +
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

// Fonction simulée pour obtenir le message répondu (à implémenter en fonction de la plateforme)
async function fetchRepliedMessage(senderId, pageAccessToken) {
  // Implémente cette fonction selon la logique de récupération des messages
  return null; // Simulation pour l'instant
}
