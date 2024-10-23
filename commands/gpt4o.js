const axios = require('axios');

module.exports = {
  name: 'c',
  description: 'Pose une question à GPT-4',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-4 est en train de répondre
      await sendMessage(senderId, { text: '💬 *GPT-4 est en train de te répondre* ⏳...\n\n─────★─────' }, pageAccessToken);

      // Appeler l'API GPT-4 via l'URL de la 2e version
      const response = await axios.post('https://free-ai-models.vercel.app/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are AI(gpt4-o)' },
          { role: 'user', content: prompt }
        ]
      });

      const text = response.data.response;

      // Créer un style avec un contour pour la réponse de GPT-4
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

    } catch (error) {
      console.error('Error calling GPT-4 API:', error);
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
