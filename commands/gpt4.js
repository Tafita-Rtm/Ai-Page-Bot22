const axios = require('axios');

module.exports = {
  name: 'spotify',
  description: 'Play a song from Spotify',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const header = "🎶 Spotify Music Player\n───────────────";
    const footer = "───────────────";

    // Fonction pour extraire le titre de la chanson et l'artiste
    const { songTitle, artist } = getSongTitleAndArtist(args);

    if (!songTitle) {
      return sendMessage(senderId, { text: `${header}\nPlease provide a song title to play.\n${footer}` }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que la chanson est en cours de recherche
      await sendMessage(senderId, { text: `🔍 *Searching for "${songTitle}" by ${artist || "unknown artist"}...* ⏳` }, pageAccessToken);

      // Services pour récupérer les URLs de la chanson
      const services = [
        { url: 'https://spotify-play-iota.vercel.app/spotify', params: { query: songTitle } },
        { url: 'http://zcdsphapilist.replit.app/spotify', params: { q: songTitle } },
        { url: 'https://openapi-idk8.onrender.com/search-song', params: { song: songTitle } },
        { url: 'https://markdevs-last-api.onrender.com/search/spotify', params: { q: songTitle } }
      ];

      // Récupérer les URLs de la chanson
      const trackURLs = await fetchTrackURLs(services);
      const trackID = trackURLs[0];

      // Récupérer le lien de téléchargement pour le track ID sélectionné
      const downloadResponse = await axios.get(`https://sp-dl-bice.vercel.app/spotify?id=${encodeURIComponent(trackID)}`);
      const downloadLink = downloadResponse.data.download_link;

      // Télécharger et envoyer la chanson en flux
      await sendTrackAsStream(downloadLink, senderId, songTitle, artist, sendMessage, pageAccessToken);

    } catch (error) {
      console.error("Error occurred:", error);
      await sendMessage(senderId, { text: `${header}\nAn error occurred: ${error.message}\n${footer}` }, pageAccessToken);
    }
  }
};

// Fonction pour extraire le titre de la chanson et l'artiste
function getSongTitleAndArtist(args) {
  let songTitle, artist;

  const byIndex = args.indexOf("by");
  if (byIndex !== -1 && byIndex > 0 && byIndex < args.length - 1) {
    songTitle = args.slice(0, byIndex).join(" ");
    artist = args.slice(byIndex + 1).join(" ");
  } else {
    songTitle = args.join(" ");
  }

  return { songTitle, artist };
}

// Fonction pour récupérer les URLs de la chanson
async function fetchTrackURLs(services) {
  for (const service of services) {
    try {
      const response = await axios.get(service.url, { params: service.params });

      if (response.data.trackURLs && response.data.trackURLs.length > 0) {
        return response.data.trackURLs;
      }
    } catch (error) {
      console.error(`Error with ${service.url} API:`, error.message);
    }
  }
  throw new Error("No track URLs found from any API.");
}

// Fonction pour télécharger et envoyer le fichier audio en flux
async function sendTrackAsStream(downloadLink, senderId, songTitle, artist, sendMessage, pageAccessToken) {
  try {
    const response = await axios({
      url: downloadLink,
      method: 'GET',
      responseType: 'arraybuffer'  // Téléchargement du fichier sous forme de données binaires
    });

    // Envoyer le fichier en flux directement
    await sendMessage(senderId, {
      text: `🎧 Now playing: ${songTitle}${artist ? ` by ${artist}` : ''}`,
      attachment: Buffer.from(response.data, 'binary') // Convertir les données en buffer
    }, pageAccessToken);

  } catch (error) {
    console.error("Error downloading or sending the track:", error.message);
    throw new Error("Error downloading or sending the track.");
  }
}
