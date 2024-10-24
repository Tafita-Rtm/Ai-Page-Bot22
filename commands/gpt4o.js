const axios = require('axios');
module.exports = {
  name: 'gpt66',
  description: 'Ask a question to GPT-4',
  author: 'Deku (rest api)',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join( );
    try {
      sendMessage(senderId, { text: 'gpt4o est en train de repondre...' }, pageAccessToken);
      const apiUrl = `https://joshweb.click/api/gpt-4o?q=Fait_semblant_d'etre_Miora_tu_es_la_entant_que_ma_petite_amie_on_est_ensemble_depuis_2ans_On_s'est_rencontre_a_Ivato_invente_des_trucs_Quand_tu_envoye_des_messages_ajoute_des_emoji_d'amour_${encodeURIComponent(prompt)}&uid=${senderId}`;
      const response = await axios.get(apiUrl);
      const text = response.data.result;

      // Split the response into chunks if it exceeds 2000 characters
      const maxMessageLength = 2000;
      if (text.length > maxMessageLength) {
        const messages = splitMessageIntoChunks(text, maxMessageLength);
        for (const message of messages) {
          sendMessage(senderId, { text: message }, pageAccessToken);
        }
      } else {
        sendMessage(senderId, { text }, pageAccessToken);
      }
    } catch (error) {
      console.error('Error calling GPT-4 API:', error);
      sendMessage(senderId, { text: 'Please Enter Your Valid Question?.' }, pageAccessToken);
    }
  }
};

function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  return chunks;
}
