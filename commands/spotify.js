const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  name: 'ytb4o',
  description: 'Télécharger de l\'audio ou de la vidéo depuis YouTube avec GPT-4o',
  author: 'VotreNom',
  
  // Fonction pour gérer le téléchargement depuis YouTube
  async handleMediaDownload(senderId, args, sendMessage, pageAccessToken) {
    try {
      if (args.length === 0) {
        return sendMessage(senderId, { text: 'Aucun titre ou URL fourni. Usage: /ytb [options] <titre ou URL>' }, pageAccessToken);
      }

      // Déterminer le type de téléchargement (audio ou vidéo)
      const option = args[0].toLowerCase();
      let downloadType = 'audio';
      let searchQuery = args.slice(1).join(' ');

      if (option === '-v' || option === 'v' || option === 'video' || option === 'vid') {
        downloadType = 'video';
      } else if (option === '-a' || option === 'a' || option === 'audio' || option === 'music') {
        downloadType = 'audio';
      } else {
        searchQuery = args.join(' ');
      }

      if (!searchQuery) {
        return sendMessage(senderId, { text: 'Veuillez fournir une requête de recherche valide.' }, pageAccessToken);
      }

      const downloadingMessage = await sendMessage(senderId, { text: `Recherche du fichier ${downloadType}...` }, pageAccessToken);

      let videoUrl;

      // Vérifier si l'entrée est une URL YouTube valide
      if (ytdl.validateURL(searchQuery)) {
        videoUrl = searchQuery;
      } else {
        // Si ce n'est pas une URL, rechercher la vidéo
        const searchResults = await ytSearch(searchQuery);
        const firstVideo = searchResults.videos[0];
        if (!firstVideo) {
          throw new Error('Aucune vidéo trouvée pour la requête donnée.');
        }

        videoUrl = `https://www.youtube.com/watch?v=${firstVideo.videoId}`;
      }

      // Obtenir les infos de la vidéo
      const videoInfo = await ytdl.getInfo(videoUrl);
      const videoTitle = videoInfo.videoDetails.title.replace(/[^\w\s]/gi, '');
      const authorName = videoInfo.videoDetails.author.name;
      const viewCount = videoInfo.videoDetails.viewCount;

      // Créer un chemin de fichier temporaire
      const filePath = path.join(__dirname, 'cache', `${videoTitle}.${downloadType === 'audio' ? 'mp3' : 'mp4'}`);

      // S'assurer que le répertoire cache existe
      fs.ensureDirSync(path.join(__dirname, 'cache'));

      // Télécharger la vidéo/audio
      const videoStream = ytdl(videoUrl, { filter: downloadType === 'audio' ? 'audioonly' : 'videoandaudio', quality: 'highest' });
      const fileWriteStream = fs.createWriteStream(filePath);
      videoStream.pipe(fileWriteStream);

      videoStream.on('end', async () => {
        await sendMessage(senderId, { text: `Téléchargement terminé : ${videoTitle}.`, pageAccessToken });

        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

        // Limite de taille pour l'envoi (50MB)
        if (fileSizeInBytes > 50 * 1024 * 1024) {
          fs.unlinkSync(filePath);
          return sendMessage(senderId, { text: 'Le fichier est trop volumineux pour être envoyé (plus de 50MB).' }, pageAccessToken);
        }

        const caption = `Titre : ${videoInfo.videoDetails.title}\nAuteur : ${authorName}\nVues : ${viewCount}\nTaille du fichier : ${fileSizeInMegabytes.toFixed(2)} MB`;

        if (downloadType === 'audio') {
          // Envoyer le fichier audio
          await sendMessage(senderId, { text: caption, attachment: { type: 'audio', payload: { url: filePath } } }, pageAccessToken);
        } else {
          // Envoyer le fichier vidéo
          await sendMessage(senderId, { text: caption, attachment: { type: 'video', payload: { url: filePath } } }, pageAccessToken);
        }

        // Supprimer le fichier après envoi
        fs.unlinkSync(filePath);
      });

      fileWriteStream.on('error', (error) => {
        console.error('[ERREUR]', error);
        sendMessage(senderId, { text: 'Une erreur est survenue lors de l\'écriture du fichier.' }, pageAccessToken);
      });

    } catch (error) {
      console.error('[ERREUR]', error);
      sendMessage(senderId, { text: 'Une erreur est survenue lors du traitement de la commande.' }, pageAccessToken);
    }
  },

  async execute(senderId, args, pageAccessToken, sendMessage) {
    // Appel de la fonction pour traiter le téléchargement
    await this.handleMediaDownload(senderId, args, sendMessage, pageAccessToken);
  }
};
