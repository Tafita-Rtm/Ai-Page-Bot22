const axios = require('axios');
const path = require('path');

module.exports = {
  name: 'claude',
  description: 'Analyse une image avec GPT-4o ou pose une question',
  author: 'Deku (rest api)',
  
  async execute(senderId, args, pageAccessToken, sendMessage) {
    try {
      // Si le message contient une référence à une image (par exemple réponse à une image)
      if (args[0] && args[0].startsWith('http')) {
        const imageUrl = args[0]; // L'URL de l'image est passée comme premier argument
        const query = args.slice(1).join(' ') || "Décris cette image."; // Le reste des arguments est la question
        await sendMessage(senderId, { text: '🔍 Analyse de l\'image en cours... ⏳' }, pageAccessToken);
        
        const geminiUrl = `https://deku-rest-api.gleeze.com/gemini?prompt=${encodeURIComponent(query)}&url=${encodeURIComponent(imageUrl)}`;
        const { data } = await axios.get(geminiUrl);

        // Formatage de la réponse de GPT-4o
        const formattedResponse = formatResponse(data.gemini);
        await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
      } else {
        const prompt = args.join(' ');
        
        if (!prompt) {
          return sendMessage(senderId, { text: "Veuillez entrer une question valide ou une URL d'image." }, pageAccessToken);
        }

        // Envoyer un message indiquant que GPT-4o est en train de répondre à la question
        await sendMessage(senderId, { text: '💬 *GPT-4o est en train de te répondre* ⏳...\n\n─────★─────' }, pageAccessToken);
        
        const apiUrl = `https://deku-rest-apis.ooguy.com/api/gpt-4o?q=${encodeURIComponent(prompt)}&uid=100${senderId}`;
        const response = await axios.get(apiUrl);
        const text = response.data.result;

        // Créer un style avec un contour pour la réponse de GPT-4o
        const formattedResponse = `─────★─────\n` +
                                  `✨GPT-4o mini🤖🇲🇬\n\n${text}\n` +
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
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel à l\'API GPT-4o:', error);
      // Message de réponse d'erreur
      await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
    }
  }
};

// Fonction pour formater la réponse
function formatResponse(response) {
  return response.replace(/\*\*(.*?)\*\*/g, (match, p1) => global.convertToGothic(p1));
}

// Fonction pour découper les messages en morceaux de 2000 caractères
function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  return chunks;
}
