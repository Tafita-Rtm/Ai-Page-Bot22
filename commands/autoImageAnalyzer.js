const axios = require('axios');

module.exports = {
  name: 'autoImageAnalyzer',
  description: 'Analyse automatiquement une image envoyée et retourne les résultats.',
  author: 'ArYAN',
  async execute(senderId, attachments, pageAccessToken, sendMessage) {
    // Vérification s'il y a des images dans les pièces jointes
    if (!attachments || attachments.length === 0 || !attachments.some(att => att.type === 'photo')) {
      return sendMessage(senderId, { text: "Veuillez envoyer une image pour analyse." }, pageAccessToken);
    }

    // Filtrer pour récupérer uniquement les images
    const images = attachments.filter(att => att.type === 'photo');
    const imageUrl = images[0].url;  // Utilise la première image

    try {
      // Envoyer un message indiquant que l'analyse de l'image est en cours
      const analyzingMessage = await sendMessage(senderId, { text: '🖼️ Analyse de l\'image en cours... ⏳' }, pageAccessToken);

      // Appel des services pour analyser l'image
      const analysisResult = await getImageAnalysis(imageUrl, senderId);

      // Envoyer le résultat formaté de l'analyse
      const formattedResponse = `🌍 | Analyse de l'image :\n━━━━━━━━✨━━━━━━━\n${analysisResult}\n━━━━━━━━━━━━━━━━`;
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      // Supprimer le message d'attente
      await analyzingMessage.delete();
    } catch (error) {
      console.error('Erreur lors de l\'analyse de l\'image :', error);
      await sendMessage(senderId, { text: "❌ Erreur lors de l'analyse de l'image. Réessayez plus tard." }, pageAccessToken);
    }
  }
};

// Fonction pour appeler les services d'analyse d'image
async function getImageAnalysis(imageUrl, senderID) {
  const services = [
    {
      name: 'Google Bard Image Recognition',
      url: 'https://api-bard.easy0.repl.co/api/bard',
      param: { message: 'message', url: 'url', userID: 'userID' },
      apiKey: 'ISOYXD',
      isCustom: true
    },
    {
      name: 'Image Enhancer',
      url: 'https://hazeyy-apis-combine.kyrinwu.repl.co/api/try/remini',
      param: { url: 'url' },
      isCustom: true
    }
  ];

  const promises = services.map(service => callImageService(service, imageUrl, senderID));
  const results = await Promise.allSettled(promises);

  let combinedResults = '';
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      combinedResults += `${result.value}\n`;
    }
  }

  if (!combinedResults) {
    throw new Error('Aucun service n\'a pu fournir une réponse valide');
  }

  return combinedResults.trim();
}

async function callImageService(service, imageUrl, senderID) {
  const params = {};

  for (const [key, value] of Object.entries(service.param)) {
    params[key] = key === 'userID' ? senderID : encodeURIComponent(imageUrl);
  }

  const queryString = new URLSearchParams(params).toString();

  try {
    const response = await axios.get(`${service.url}?${queryString}`);
    if (service.isCustom) {
      return response.data.content || response.data.image_data;
    }
    return response.data;
  } catch (error) {
    console.error(`Erreur du service ${service.name} : ${error.message}`);
    throw new Error(`Erreur du service ${service.name} : ${error.message}`);
  }
}
