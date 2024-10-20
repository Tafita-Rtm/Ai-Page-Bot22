const axios = require('axios');
const path = require('path');

module.exports = {
  name: 'claude3',
  description: 'Posez une question à GPT-4o ou répondez avec une image.',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const query = args.join(' ');

    if (!query) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-4 est en train de répondre
      const thinkingMessage = await sendMessage(senderId, { text: 'GPT-4o réfléchit... 🤔' }, pageAccessToken);

      // Si le message auquel on répond contient une image
      if (args.length === 0) {
        const repliedMessage = await fetchRepliedMessage(senderId, pageAccessToken); // Fonction simulée pour obtenir le message répondu
        if (repliedMessage && repliedMessage.attachments && repliedMessage.attachments[0].type === 'image') {
          const imageUrl = repliedMessage.attachments[0].url;
          const imageQuery = "Décris cette image.";
          await handleImage(senderId, imageUrl, imageQuery, sendMessage, pageAccessToken);
          return;
        }
      }

      // URL pour appeler l'API GPT-4o avec une question
      const apiUrl = `https://deku-rest-api.gleeze.com/api/gpt-4o?q=${encodeURIComponent(query)}&uid=${senderId}`;
      const response = await axios.get(apiUrl);

      const text = formatResponse(response.data.result);

      // Envoyer la réponse formatée avec un GIF
      const gifPath = path.join(__dirname, '..', 'assets', 'gpt4.gif');
      await sendMessage(senderId, { text: text, files: [gifPath] }, pageAccessToken);

      // Supprimer le message d'attente
      await thinkingMessage.delete();

    } catch (error) {
      console.error('Erreur lors de la requête à GPT-4o :', error);
      // Message de réponse en cas d'erreur
      await sendMessage(senderId, { text: "Désolé, une erreur est survenue. Veuillez réessayer plus tard." }, pageAccessToken);
    }
  }
};

// Fonction pour gérer les images
async function handleImage(senderId, imageUrl, query, sendMessage, pageAccessToken) {
  try {
    const geminiUrl = `https://deku-rest-api.gleeze.com/gemini?prompt=${encodeURIComponent(query)}&url=${encodeURIComponent(imageUrl)}`;
    const { data } = await axios.get(geminiUrl);
    const formattedResponse = formatResponse(data.gemini);

    // Envoyer la réponse formatée
    await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
  } catch (error) {
    console.error('Erreur lors de l’analyse de l’image :', error);
    await sendMessage(senderId, { text: "Désolé, je n'ai pas pu analyser l'image." }, pageAccessToken);
  }
}

// Fonction pour formater la réponse (remplace les **texte** par un style gothique)
function formatResponse(response) {
  return response.replace(/\*\*(.*?)\*\*/g, (match, p1) => global.convertToGothic(p1));
}
