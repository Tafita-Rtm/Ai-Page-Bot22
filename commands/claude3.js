// gpt4o.js (exemple simplifié)
const axios = require('axios');

module.exports = {
  name: 'gpt4o',
  description: 'Pose une question à GPT-4o ou analyse une image.',
  
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    try {
      const apiUrl = `https://deku-rest-apis.ooguy.com/api/gpt-4o?q=${encodeURIComponent(prompt)}&uid=100${senderId}`;
      const response = await axios.get(apiUrl);
      const text = response.data.result;
      
      await sendMessage(senderId, { text }, pageAccessToken);
    } catch (error) {
      console.error('Erreur lors de l\'appel à GPT-4o:', error);
      await sendMessage(senderId, { text: 'Erreur lors de la réponse de GPT-4o.' }, pageAccessToken);
    }
  },

  async handleImage(senderId, imageUrl, query, sendMessage, pageAccessToken) {
    try {
      const apiUrl = `https://deku-rest-apis.ooguy.com/gemini?prompt=${encodeURIComponent(query)}&url=${encodeURIComponent(imageUrl)}`;
      const { data } = await axios.get(apiUrl);
      const formattedResponse = `GPT-4o a analysé l'image :\n\n${data.gemini}`;
      
      await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
    } catch (error) {
      console.error('Erreur lors de l\'analyse de l\'image:', error);
      await sendMessage(senderId, { text: "Erreur lors de l'analyse de l'image." }, pageAccessToken);
    }
  }
};
