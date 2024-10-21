const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  name: 'spotify',
  description: 'Play a song from Spotify',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const query = args.join(' ') || "default song";
    const cacheFolder = path.join(__dirname, 'cache');
    const header = "🎶 Spotify Music Player\n───────────────";
    const footer = "───────────────";

    // Vérifier et créer le dossier de cache si nécessaire
    async function ensureCacheFolderExists() {
      try {
        await fs.ensureDir(cacheFolder);
      } catch (error) {
        console.error('Error creating cache folder:', error);
      }
    }

    // Appeler la fonction pour vérifier si le cache existe
    await ensureCacheFolderExists();

    if (!query) {
      return sendMessage(senderId, { text: `${header}\nPlease provide a valid song name.\n${footer}` }, pageAccessToken);
    }

    // Envoyer un message indiquant que la chanson est en cours de récupération
    await sendMessage(senderId, { text: `🎧 *Searching for "${query}"...* ⏳\n\n─────★─────` }, pageAccessToken);

    try {
      // Services disponibles pour récupérer les URLs des pistes
      const services = [
        { url: 'https://spotify-play-iota.vercel.app/spotify', params: { query } },
        { url: 'http://zcdsphapilist.replit.app/spotify', params: { q: query } },
        { url: 'https://openapi-idk8.onrender.com/search-song', params: { song: query } },
        { url: 'https://markdevs-last-api.onrender.com/search/spotify', params: { q: query } }
      ];

      // Récupérer les URLs des pistes
      const trackURLs = await fetchTrackURLs(services);
      const trackID = trackURLs[0];

      // Récupérer le lien de téléchargement
      const downloadResponse = await axios.get(`https://sp-dl-bice.vercel.app/spotify?id=${encodeURIComponent(trackID)}`);
      const downloadLink = downloadResponse.data.download_link;

      // Télécharger la chanson et envoyer en pièce jointe
      const filePath = await downloadTrack(downloadLink);
      await sendMessage(senderId, {
        text: `${header}\n🎧 Playing: ${query}\n${footer}`,
        attachment: fs.createReadStream(filePath)
      }, pageAccessToken);

      // Supprimer le fichier téléchargé après l'envoi
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file:", err);
        else console.log("File deleted successfully.");
      });

    } catch (error) {
      console.error("Error fetching song:", error);
      await sendMessage(senderId, { text: `${header}\nAn error occurred: ${error.message}\n${footer}` }, pageAccessToken);
    }
  }
};

// Fonction pour récupérer les URLs des pistes depuis plusieurs services
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

// Fonction pour télécharger la piste audio
async function downloadTrack(url) {
  const response = await axios.get(url, { responseType: 'stream' });
  const filePath = path.join(__dirname, 'cache', `${randomString()}.mp3`);

  const writeStream = fs.createWriteStream(filePath);
  response.data.pipe(writeStream);

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

// Générer une chaîne aléatoire pour nommer le fichier
function randomString(length = 10) {
  return Math.random().toString(36).substring(2, 2 + length);
}
