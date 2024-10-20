const axios = require('axios');
const path = require('path');

module.exports = {
  name: 'gpt4o',
  description: 'Pose une question à GPT-4o ou analyse une image.',
  author: 'Deku (rest api)',
  
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que GPT-4 est en train de répondre
      await sendTyping(senderId, true, pageAccessToken); // Indicateur de saisie
      await sendMessage(senderId, { text: 'GPT-4o websearche en cours⏳...\n\n─────★─────' }, pageAccessToken);

      // URL pour appeler l'API GPT-4o avec une question
      const apiUrl = `https://deku-rest-apis.ooguy.com/api/gpt-4o?q=${encodeURIComponent(prompt)}&uid=100${senderId}`;
      const response = await axios.get(apiUrl);

      const text = response.data.result;

      // Créer un style avec un contour pour la réponse de GPT-4o
      const formattedResponse = `─────★─────\n` +
                                `✨GPT-4o web scrapers🤖🇲🇬\n\n${text}\n` +
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

      await sendTyping(senderId, false, pageAccessToken); // Désactiver l'indicateur de saisie

    } catch (error) {
      console.error('Error calling GPT-4 API:', error);
      await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
    }
  },

  // Gestion des images
  async handleImage(senderId, imageUrl, sendMessage, pageAccessToken) {
    try {
      // Demander ce que l'utilisateur souhaite faire avec l'image
      await sendMessage(senderId, { text: "Que souhaitez-vous que je fasse avec cette image ?" }, pageAccessToken);

      // Attendre la réponse de l'utilisateur avant d'analyser l'image (fonction simulée pour capter la réponse)
      const userResponse = await waitForUserResponse(senderId, pageAccessToken); // Fonction à implémenter pour attendre la réponse utilisateur

      // Indicateur de saisie pendant l'analyse de l'image
      await sendTyping(senderId, true, pageAccessToken); 

      // Construire la requête en fonction de la réponse de l'utilisateur
      const query = `Répondre à la question suivante basée sur l'image : ${userResponse}`;

      const apiUrl = `https://deku-rest-apis.ooguy.com/gemini?prompt=${encodeURIComponent(query)}&url=${encodeURIComponent(imageUrl)}`;
      const { data } = await axios.get(apiUrl);

      const formattedResponse = `─────★─────\n` +
                                `✨GPT-4o🤖🇲🇬\n\n${data.gemini}\n` +
                                `─────★─────`;

      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      await sendTyping(senderId, false, pageAccessToken); // Désactiver l'indicateur de saisie

    } catch (error) {
      console.error('Error handling image:', error);
      await sendMessage(senderId, { text: "Désolé, je n'ai pas pu analyser l'image." }, pageAccessToken);
    }
  }
};

// Fonction pour envoyer l'indicateur de saisie (typing)
async function sendTyping(senderId, isTyping, pageAccessToken) {
  const typingAction = isTyping ? 'typing_on' : 'typing_off';
  await axios.post(
    `https://graph.facebook.com/v2.6/me/messages?access_token=${pageAccessToken}`,
    {
      recipient: { id: senderId },
      sender_action: typingAction
    }
  );
}

// Fonction pour attendre la réponse de l'utilisateur (à implémenter)
async function waitForUserResponse(senderId, pageAccessToken) {
  // Ici, tu dois implémenter une logique pour capter et retourner la réponse utilisateur
  // Cela peut inclure la mise en place d'un état temporaire de la conversation
  // ou l'écoute d'un message spécifique de l'utilisateur.
  // Pour l'exemple, nous retournons simplement une chaîne de texte.
  return new Promise((resolve) => {
    // Simuler une réponse utilisateur (à remplacer par une vraie logique)
    setTimeout(() => resolve("Je veux que tu répondes à toutes les questions dans l'image."), 2000);
  });
}

// Fonction pour découper les messages en morceaux de 2000 caractères
function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  return chunks;
}
