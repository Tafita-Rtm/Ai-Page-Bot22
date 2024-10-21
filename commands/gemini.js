const axios = require('axios');

module.exports = {
  name: 'gemini',
  description: 'Analyse une image et renvoie une description directement',
  author: 'Deku (adapté de vex_kshitiz)',
  
  async execute(senderId, event, pageAccessToken, sendMessage) {
    const prompt = event.body || ''; // le texte du message original (s'il y en a un)
    const attachments = event.attachments || []; // vérifier s'il y a des pièces jointes (images)

    // Vérification des pièces jointes (images)
    if (attachments.length === 0 || !attachments[0].url) {
      return sendMessage(senderId, { text: "Veuillez joindre une image pour analyse." }, pageAccessToken);
    }

    const photoUrl = attachments[0].url; // URL de l'image
    console.log("URL de l'image reçue :", photoUrl); // Log pour vérifier l'URL

    try {
      // Envoyer un message indiquant que l'analyse de l'image est en cours
      await sendMessage(senderId, { text: '💬 *Analyse de l\'image en cours* ⏳...\n\n─────★─────' }, pageAccessToken);

      // Appel de l'API pour analyser l'image
      const apiUrl = `https://sandipbaruwal.onrender.com/gemini2?prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(photoUrl)}`;
      const response = await axios.get(apiUrl);

      // Vérifier si la réponse contient une description
      if (!response.data || !response.data.answer) {
        throw new Error('L\'API n\'a pas retourné de description valide.');
      }

      const description = response.data.answer;

      // Créer un style avec un contour pour la description de l'image
      const formattedResponse = `─────★─────\n` +
                                `✨Résultat de l'analyse 🤖\n\n${description}\n` +
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
      console.error('Erreur lors de l\'appel à l\'API d\'analyse d\'image:', error.response ? error.response.data : error.message);
      // Message de réponse d'erreur
      await sendMessage(senderId, { text: 'Désolé, une erreur est survenue lors de l\'analyse de l\'image. Veuillez réessayer plus tard.' }, pageAccessToken);
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
