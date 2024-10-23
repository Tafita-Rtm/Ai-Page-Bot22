const axios = require('axios');

module.exports = {
  name: 'ai5',
  description: 'Chat avec l\'IA GPT-4o',
  nashPrefix: false,
  version: '1.0.0',
  cooldowns: 5,
  async execute(api, event, args) {
    const { threadID, messageID } = event;
    const userMessage = args.join(' ');

    if (!userMessage) {
      return api.sendMessage(
        "[ GPT-4o ]\n\n" +
        "❗ Veuillez entrer un message valide pour discuter avec l'IA.\n\nExemple: ai5 Bonjour!",
        threadID,
        messageID
      );
    }

    // Envoyer un message pour indiquer que l'IA réfléchit
    api.sendMessage(
      "[ GPT-4o ]\n\n" +
      "⏳ L'IA GPT-4o réfléchit, veuillez patienter...",
      threadID,
      async (err, info) => {
        if (err) return;

        try {
          // Appel à l'API pour obtenir la réponse de GPT-4o
          const aiResponse = await getGPT4oResponse(userMessage);

          // Envoyer la réponse formatée à l'utilisateur
          api.editMessage(
            "[ GPT-4o ]\n\n" +
            aiResponse,
            info.messageID
          );
        } catch (error) {
          console.error('Erreur lors de la requête à GPT-4o :', error);
          api.editMessage(
            "[ GPT-4o ]\n\n" +
            "❌ Erreur : Impossible de traiter votre demande. Veuillez réessayer plus tard.",
            info.messageID
          );
        }
      },
      messageID
    );
  }
};

// Fonction pour appeler le service GPT-4o
async function getGPT4oResponse(prompt) {
  try {
    const response = await axios.post('https://free-ai-models.vercel.app/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are AI(gpt4-o)' },
        { role: 'user', content: prompt }
      ]
    });

    return response.data.response;
  } catch (error) {
    throw new Error('Erreur lors de l\'appel à GPT-4o API : ' + error.message);
  }
}
