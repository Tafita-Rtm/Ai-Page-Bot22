const axios = require('axios');

module.exports = {
  name: 'gpt4o',
  description: 'Pose une question à plusieurs services AI et obtient la réponse la plus rapide.',
  author: 'ArYAN',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const query = args.join(' ');

    if (!query) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que l'IA réfléchit
      const thinkingMessage = await sendMessage(senderId, { text: '🪐rtm gpt4 réfléchit⏳... 🤔' }, pageAccessToken);

      // Appel de la fonction pour obtenir la réponse à partir de l'API
      const answer = await getAnswerFromAPI(query);

      // Envoyer la réponse formatée
      const formattedResponse = `🇲🇬 | rtm ai gpt4 ⏳\n━━━━━━━━━━━━━━━━\n${answer}\n━━━━━━━━━━━━━━━━`;
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      // Supprimer le message d'attente
      await thinkingMessage.delete();

    } catch (error) {
      console.error('Erreur lors de la requête à l\'IA :', error);
      await sendMessage(senderId, { text: "Erreur lors de l'utilisation de GPT-4o." }, pageAccessToken);
    }
  }
};

async function getAnswerFromAPI(query) {
  try {
    // Appel API vers un service AI
    const response = await axios.get(`https://gpt-four.vercel.app/gpt?prompt=${encodeURIComponent(query)}`);
    return response.data.answer || response.data;
  } catch (error) {
    console.error('Erreur lors de la requête au service AI :', error.message);
    throw new Error('Impossible de récupérer une réponse de l\'API.');
  }
}
