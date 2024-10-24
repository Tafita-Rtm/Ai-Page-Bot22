const axios = require('axios');

module.exports = {
  name: 'gpt4o',
  description: 'Ask a question to GPT-4o',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-4o est en train de répondre
      await sendMessage(senderId, { text: '💬 *GPT-4o est en train de te répondre* ⏳...\n\n─────★─────' }, pageAccessToken);

      // URL pour appeler l'API GPT-4o
      const apiUrl = `https://joshweb.click/api/gpt-4o?q=Tu_es_une_intelligence_artificielle_plus_avancee_GPT-4o_capable_de_faire_des_recherches_sur_internet_et_repondre_a_toutes_les_questions_tu_es_capable_de_tout_faire_${encodeURIComponent(prompt)}&uid=${senderId}`;
      const response = await axios.get(apiUrl);
      const text = response.data.result;

      // Créer un style avec un contour pour la réponse de GPT-4o
      const formattedResponse = `─────★─────\n` +
                                `✨ GPT-4o 🤖\n\n${text}\n` +
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
      console.error('Error calling GPT-4o API:', error);
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
