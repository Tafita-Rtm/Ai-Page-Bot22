const axios = require('axios');

module.exports = {
  name: 'gpt4o128k',
  description: 'Pose une question à GPT-4o en utilisant l\'API Kenlie Jugarap.',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-4 est en train de répondre
      await sendMessage(senderId, { text: 'GPT-4o128k en train de traiter ta requête⏳...\n\n─────★─────' }, pageAccessToken);

      // URL pour appeler l'API GPT-4o avec une question
      const apiUrl = `https://api.kenliejugarap.com/freegpt4o128k/`;
      const response = await axios.get(apiUrl, {
        params: { question: encodeURIComponent(prompt) },
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

      // Traiter la réponse pour retirer tout texte indésirable
      let result = response.data.response;
      const unwantedTextPattern = /\n\n.*(https:\/\/click2donate\.kenliejugarap\.com.*)/s;
      result = result.replace(unwantedTextPattern, '');

      // Créer un style avec un contour pour la réponse de GPT-4
      const formattedResponse = `─────★─────\n` +
                                `✨GPT-4o128k🤖\n\n${result}\n` +
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

// Fonction pour découper les messages en morceaux de 2000 caractères
function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  return chunks;
}
