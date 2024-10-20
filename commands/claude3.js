const axios = require('axios');

module.exports = {
  name: 'claude',
  description: 'Interagir avec l\'IA (GPT-4o)',
  author: 'Votre Nom',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer un message valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que l'IA est en train de répondre
      await sendMessage(senderId, { text: '💬 *L\'IA est en train de te répondre* ⏳...\n\n─────★─────' }, pageAccessToken);

      // URL pour appeler l'API GPT-4o
      const apiUrl = `https://free-ai-models.vercel.app/v1/chat/completions`;
      const response = await axios.post(apiUrl, {
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      const text = response.data.response;

      // Créer un style avec un contour pour la réponse de l'IA
      const formattedResponse = `─────★─────\n` +
                                `✨ Réponse de l'IA 🤖\n\n${text}\n` +
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
      console.error('Error calling AI API:', error);
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
