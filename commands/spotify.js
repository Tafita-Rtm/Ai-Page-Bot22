const axios = require('axios');

module.exports = {
  name: 'gpt',
  description: 'Ask a question to GPT-4',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const query = args.join(' ');

    if (!query) {
      return sendMessage(senderId, { text: "🗨️✨ | 𝙲𝚑𝚊𝚝𝙶𝙿𝚃\n━━━━━━━━━━━━━━━━\nHello! How can I assist you today?\n━━━━━━━━━━━━━━━━" }, pageAccessToken);
    }

    try {
      // Indiquer que GPT-4 est en train de répondre
      await sendMessage(senderId, { text: '💬 *GPT-4 is typing* ⏳...\n\n─────★─────' }, pageAccessToken);

      // Envoyer la requête à l'API GPT-4
      const apiUrl = `https://deku-rest-apis.ooguy.com/gpt4?prompt=${encodeURIComponent(query)}&uid=${senderId}`;
      const response = await axios.get(apiUrl);

      const gptResponse = response.data.gpt4;

      // Vérifier et envoyer la réponse de GPT-4
      if (gptResponse) {
        const formattedResponse = `─────★─────\n✨GPT-4 Response\n\n${gptResponse}\n─────★─────`;

        await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
      } else {
        await sendMessage(senderId, { text: "Error: Unexpected response format from API." }, pageAccessToken);
      }
    } catch (error) {
      console.error('API call failed: ', error);
      await sendMessage(senderId, { text: 'Sorry, an error occurred. Please try again later.' }, pageAccessToken);
    }
  }
};
