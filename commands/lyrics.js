const axios = require('axios');

module.exports = {
  name: 'lyrics',
  description: 'Get lyrics for a song',
  author: 'rulex-al/loufi',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const songName = args.join(' ');

    if (!songName) {
      return sendMessage(senderId, { text: "Please provide a song name!" }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que les paroles sont en cours de recherche
      await sendMessage(senderId, { text: '🎵 Searching for lyrics... ⏳\n\n─────★─────' }, pageAccessToken);

      // URL pour appeler l'API des paroles
      const apiUrl = `https://lyrist.vercel.app/api/${encodeURIComponent(songName)}`;
      const response = await axios.get(apiUrl);

      const lyrics = response.data.lyrics;

      if (!lyrics) {
        return sendMessage(senderId, { text: "Sorry, lyrics not found!" }, pageAccessToken);
      }

      // Créer un style avec un contour pour les paroles
      const formattedLyrics = `─────★─────\n` +
                              `🎶 Lyrics for *${songName}*\n\n${lyrics}\n` +
                              `─────★─────`;

      // Gérer les réponses longues de plus de 2000 caractères
      const maxMessageLength = 2000;
      if (formattedLyrics.length > maxMessageLength) {
        const messages = splitMessageIntoChunks(formattedLyrics, maxMessageLength);
        for (const message of messages) {
          await sendMessage(senderId, { text: message }, pageAccessToken);
        }
      } else {
        await sendMessage(senderId, { text: formattedLyrics }, pageAccessToken);
      }

    } catch (error) {
      console.error('Error fetching lyrics:', error);
      // Message de réponse d'erreur
      await sendMessage(senderId, { text: 'Sorry, there was an error getting the lyrics!' }, pageAccessToken);
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

