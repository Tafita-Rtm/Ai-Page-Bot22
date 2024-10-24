const axios = require('axios');

module.exports = {
  name: 'GPT4o',
  description: 'Ask a question to GPT-4',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que l'IA est en train de répondre avec un cadre personnalisé
      await sendMessage(senderId, { text: '💬 GPT4o webscrapers🔍 ⏳...\n\n─────★─────' }, pageAccessToken);

      // Appel à l'API GPT-4
      const apiUrl = `https://joshweb.click/api/gpt-4o?q=${encodeURIComponent(prompt)}&uid=${senderId}`;
      const response = await axios.get(apiUrl);
      const text = response.data.result;

      // Créer un style avec un contour pour la réponse de GPT-4
      const formattedResponse = `─────★─────\n` +
                                `✨ GPT4o web 🇲🇬\n\n${text}\n` +
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
