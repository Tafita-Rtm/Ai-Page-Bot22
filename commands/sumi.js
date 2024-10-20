const axios = require('axios');

module.exports = {
  name: 'gpt4o',
  description: 'Gpt4 AI with multiple conversation handling',
  author: 'Dipto',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const query = args.join(' ').toLowerCase();

    if (!query) {
      return sendMessage(senderId, { text: "Please provide a question to answer.\n\nExample:\n!gpt4 hey" }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que l'IA réfléchit
      const thinkingMessage = await sendMessage(senderId, { text: '🤖 Gpt4 is thinking... 🤔' }, pageAccessToken);

      // Appel de la fonction pour obtenir la réponse
      const answer = await getAnswerFromGPT4(query, senderId);

      // Envoyer la réponse formatée
      const formattedResponse = `🤖 Gpt4 Response\n━━━━━━━━━━━━━━━━\n${answer}\n━━━━━━━━━━━━━━━━`;
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

      // Supprimer le message d'attente
      await thinkingMessage.delete();

    } catch (error) {
      console.error('Error while fetching AI response:', error);
      // Message de réponse en cas d'erreur
      await sendMessage(senderId, { text: `Error: ${error.message}` }, pageAccessToken);
    }
  }
};

// Fonction pour obtenir l'URL de base de l'API
async function getBaseUrl() {
  try {
    const base = await axios.get('https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json');
    return base.data.api;
  } catch (error) {
    console.error('Failed to fetch base API URL:', error.message);
    throw new Error('Failed to fetch base API URL');
  }
}

// Fonction pour obtenir une réponse de GPT-4
async function getAnswerFromGPT4(query, senderID) {
  const baseUrl = await getBaseUrl();
  try {
    const response = await axios.get(`${baseUrl}/gpt4?text=${encodeURIComponent(query)}&senderID=${senderID}`);
    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch GPT-4 answer: ${error.message}`);
    throw new Error(`Failed to fetch GPT-4 answer: ${error.message}`);
  }
}

// Fonction pour gérer une réponse au message
module.exports.onReply = async function ({ message, event, Reply }) {
  const { author, type } = Reply;

  if (author !== event.from.id) return;

  if (type === 'reply') {
    const reply = event.text?.toLowerCase();
    if (isNaN(reply)) {
      try {
        const baseUrl = await getBaseUrl();
        const response = await axios.get(`${baseUrl}/gpt4?text=${encodeURIComponent(reply)}&senderID=${author}`);
        const replyText = response.data.data;
        const info = await message.reply(replyText);

        global.functions.onReply.set(info.message_id, {
          commandName: this.config.name,
          type: 'reply',
          messageID: info.message_id,
          author,
          link: replyText,
        });
      } catch (err) {
        console.error(`Error while fetching GPT-4 reply: ${err.message}`);
        message.reply(`Error: ${err.message}`);
      }
    }
  }
};
