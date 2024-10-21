const axios = require('axios');

module.exports = {
  name: 'gptv1',
  description: 'Pose une question à GPT-v1 via l\'API Kenlie Jugarap',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-v1 est en train de répondre
      await sendMessage(senderId, { text: '💬 *GPT-v1 est en train de te répondre* ⏳...\n\n─────★─────' }, pageAccessToken);

      // URL pour appeler l'API GPT-v1
      const apiUrl = `https://api.kenliejugarap.com/freegptv1/?question=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl, {
        headers: {
          'Referer': 'https://api.kenliejugarap.com/',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'accept': 'text/event-stream',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin'
        }
      });

      const text = response.data.response;

      // Nettoyer le texte pour enlever tout lien indésirable
      const unwantedTextPattern = /\n\n.*(https:\/\/click2donate\.kenliejugarap\.com.*)/s;
      const cleanedText = text.replace(unwantedTextPattern, '');

      // Créer un style avec un contour pour la réponse de GPT-v1
      const formattedResponse = `─────★─────\n` +
                                `✨GPT-v1🤖\n\n${cleanedText}\n` +
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
      console.error('Error calling GPT-v1 API:', error);
      // Message de réponse d'erreur
      await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
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
