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

      // Appel de la fonction pour obtenir la réponse la plus rapide parmi les services
      const fastestAnswer = await getFastestValidAnswer(query, senderId);

      // Envoyer la réponse formatée
      const formattedResponse = `🇲🇬 | rtm ai gpt4 ⏳\n━━━━━━━━━━━━━━━━\n${fastestAnswer}\n━━━━━━━━━━━━━━━━`;
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      // Supprimer le message d'attente
      await thinkingMessage.delete();

    } catch (error) {
      console.error('Erreur lors de la requête à l\'IA :', error);
      await sendMessage(senderId, { text: 'Erreur lors de l\'utilisation de l\'IA.' }, pageAccessToken);
    }
  },

  async handleImage(senderId, imageUrl, prompt, sendMessage, pageAccessToken) {
    try {
      // Envoyer un message indiquant que l'IA réfléchit sur l'image
      const thinkingMessage = await sendMessage(senderId, { text: '🖼️ Analyzing the image... Please wait ⏳' }, pageAccessToken);

      // Appel de la fonction pour obtenir la description de l'image
      const description = await getFastestValidAnswerForImage(imageUrl, senderId);

      // Envoyer la description formatée
      const formattedResponse = `🖼️ | Image Analysis:\n━━━━━━━━━━━━━━━━\n${description}\n━━━━━━━━━━━━━━━━`;
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      // Supprimer le message d'attente
      await thinkingMessage.delete();
      
    } catch (error) {
      console.error('Erreur lors de l\'analyse de l\'image avec l\'IA :', error);
      await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
    }
  }
};

// Fonction pour appeler un service AI
async function callService(service, prompt, senderID) {
  if (service.isCustom) {
    try {
      const response = await axios.get(`${service.url}?${service.param.prompt}=${encodeURIComponent(prompt)}`);
      return response.data.answer || response.data;
    } catch (error) {
      console.error(`Erreur du service personnalisé ${service.url}: ${error.message}`);
      throw new Error(`Erreur du service ${service.url}: ${error.message}`);
    }
  } else {
    const params = {};
    for (const [key, value] of Object.entries(service.param)) {
      params[key] = key === 'uid' ? senderID : encodeURIComponent(prompt);
    }
    const queryString = new URLSearchParams(params).toString();
    try {
      const response = await axios.get(`${service.url}?${queryString}`);
      return response.data.answer || response.data;
    } catch (error) {
      console.error(`Erreur du service ${service.url}: ${error.message}`);
      throw new Error(`Erreur du service ${service.url}: ${error.message}`);
    }
  }
}

// Fonction pour obtenir la réponse la plus rapide parmi les services pour un texte
async function getFastestValidAnswer(prompt, senderID) {
  const services = [
    { url: 'https://gpt-four.vercel.app/gpt', param: { prompt: 'prompt' }, isCustom: true }
  ];

  const promises = services.map(service => callService(service, prompt, senderID));
  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  throw new Error('Tous les services ont échoué à fournir une réponse valide');
}

// Fonction pour obtenir la réponse la plus rapide parmi les services pour une image
async function getFastestValidAnswerForImage(imageUrl, senderID) {
  const services = [
    { url: 'https://gpt-four.vercel.app/gpt', param: { prompt: 'imageUrl' }, isCustom: true }
  ];

  const promises = services.map(service => callService(service, imageUrl, senderID));
  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  throw new Error('Tous les services ont échoué à analyser l\'image');
}
