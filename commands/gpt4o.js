const axios = require('axios');

module.exports = {
  name: 'gpt4o',
  description: 'Pose une question à GPT-4o et analyse les images.',
  author: 'ArYAN',

  async execute(senderId, args, pageAccessToken, sendMessage) {
    const query = args.join(' ');

    if (!query) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-4 réfléchit
      const thinkingMessage = await sendMessage(senderId, { text: '🪐 GPT-4o réfléchit... ⏳' }, pageAccessToken);

      // Appel de la fonction pour obtenir la réponse la plus rapide
      const fastestAnswer = await getFastestValidAnswer(query, senderId);

      // Envoyer la réponse formatée
      const formattedResponse = `🇲🇬 | GPT-4o 🧠\n━━━━━━━━━━━━━━━\n${fastestAnswer}\n━━━━━━━━━━━━━━━`;
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      // Supprimer le message d'attente
      await thinkingMessage.delete();

    } catch (error) {
      console.error('Erreur lors de la requête à GPT-4o :', error);
      await sendMessage(senderId, { text: 'Erreur lors de l\'utilisation de GPT-4o.' }, pageAccessToken);
    }
  },

  async handleImage(senderId, imageUrl, sendMessage, pageAccessToken) {
    try {
      // Envoyer un message indiquant que GPT-4 réfléchit sur l'image
      const thinkingMessage = await sendMessage(senderId, { text: '🖼️ Analyzing the image... Please wait ⏳' }, pageAccessToken);

      // Appel de la fonction pour obtenir la description de l'image
      const description = await getFastestValidAnswerForImage(imageUrl, senderId);

      // Envoyer la description formatée
      const formattedResponse = `🖼️ | Image Analysis:\n━━━━━━━━━━━━━━━\n${description}\n━━━━━━━━━━━━━━━`;
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      // Supprimer le message d'attente
      await thinkingMessage.delete();

    } catch (error) {
      console.error('Erreur lors de l\'analyse de l\'image avec GPT-4o :', error);
      await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
    }
  }
};

// Fonction pour appeler un service AI pour le texte
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
    {
      url: 'https://gpt-four.vercel.app/gpt',  // API pour GPT-4 texte
      param: { prompt: 'prompt' },
      isCustom: true
    },
    {
      url: 'https://api.openai.com/v1/chat/completions',  // OpenAI GPT API
      param: { prompt: 'message', model: 'gpt-4' },  // Remplacez par le modèle que vous souhaitez utiliser
      isCustom: false
    },
    {
      url: 'https://free-ai-models.vercel.app/v1/chat/completions',  // Autre API AI
      param: { prompt: 'message', model: 'gpt-4o' },  // GPT-4o modèle gratuit
      isCustom: false
    }
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
    {
      url: 'https://gpt-four.vercel.app/gpt',  // API pour l'analyse d'image
      param: { prompt: 'imageUrl' },
      isCustom: true
    },
    {
      url: 'https://api.openai.com/v1/images/generations',  // API OpenAI pour l'analyse d'image
      param: { prompt: 'image', model: 'dalle' },  // Modèle DALL-E pour les images
      isCustom: false
    }
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
