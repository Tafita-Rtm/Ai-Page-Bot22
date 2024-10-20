const axios = require('axios');

module.exports = {
  name: 'gpt4o',
  description: 'Pose une question ou envoie une image à plusieurs services AI et obtient la réponse la plus rapide.',
  author: 'ArYAN',
  async execute(senderId, args, pageAccessToken, sendMessage, isImage = false, imageUrl = '') {
    const query = args.join(' ');

    if (!query && !isImage) {
      return sendMessage(senderId, { text: "Veuillez entrer une question ou envoyer une image valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que l'IA réfléchit
      const thinkingMessage = await sendMessage(senderId, { text: '🪐rtm gpt4o réfléchit... 🤔' }, pageAccessToken);

      // Appel de la fonction pour obtenir la réponse la plus rapide parmi les services
      const fastestAnswer = isImage
        ? await getFastestValidAnswerForImage(imageUrl, senderId)
        : await getFastestValidAnswer(query, senderId);

      // Envoyer la réponse formatée
      const formattedResponse = `🇲🇬 | rtm Gpt4o\n━━━━━━━━━━━━━━━━\n${fastestAnswer}\n━━━━━━━━━━━━━━━━`;
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      // Supprimer le message d'attente
      await thinkingMessage.delete();

    } catch (error) {
      console.error('Erreur lors de la requête à l\'IA :', error);
      // Message de réponse en cas d'erreur
      await sendMessage(senderId, { text: "Une erreur est survenue lors de la demande." }, pageAccessToken);
    }
  }
};

// Fonction pour appeler un service AI (texte)
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

// Fonction pour appeler un service AI (image)
async function callServiceForImage(service, imageUrl, senderID) {
  try {
    const response = await axios.post(service.url, { imageUrl, uid: senderID });
    return response.data.answer || response.data;
  } catch (error) {
    console.error(`Erreur du service pour image ${service.url}: ${error.message}`);
    throw new Error(`Erreur du service ${service.url}: ${error.message}`);
  }
}

// Fonction pour obtenir la réponse la plus rapide parmi les services (texte)
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

// Fonction pour obtenir la réponse la plus rapide parmi les services (image)
async function getFastestValidAnswerForImage(imageUrl, senderID) {
  const services = [
    { url: 'https://ai-image-service.com/process', isCustom: true } // Exemple d'un service AI pour traiter des images
  ];

  const promises = services.map(service => callServiceForImage(service, imageUrl, senderID));
  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  throw new Error('Tous les services ont échoué à fournir une réponse valide pour l\'image');
}
