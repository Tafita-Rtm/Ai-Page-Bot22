const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Export de la commande avec les propriétés demandées
module.exports = {
  name: 'pinterest',
  description: 'Search for images on Pinterest based on a query.',
  author: 'coffee',

  // Fonction principale pour exécuter la commande
  async execute(senderId, args, pageAccessToken, sendMessage) {
    if (args.length === 0) {
      return sendMessage(senderId, { text: '📷 | Please follow this format:\n-pinterest cat -5' }, pageAccessToken);
    }

    let imageCount = 1;
    const query = args.slice(0, -1).join(' ');

    const countArg = args[args.length - 1];
    if (countArg.startsWith('-')) {
      imageCount = parseInt(countArg.slice(1), 10);
      if (isNaN(imageCount) || imageCount < 1) {
        imageCount = 1;
      } else if (imageCount > 12) {
        imageCount = 12;
      }
    }

    const allImages = [];
    let fetchedImagesCount = 0;

    try {
      // Envoyer un message indiquant que les images sont en cours de recherche
      await sendMessage(senderId, { text: '🔍 *Searching for images on Pinterest* ⏳...\n\n─────★─────' }, pageAccessToken);

      while (fetchedImagesCount < imageCount) {
        const remaining = imageCount - fetchedImagesCount;
        const fetchLimit = Math.min(6, remaining);

        const images1 = await searchPinterest(query);
        if (images1.result) {
          allImages.push(...images1.result.slice(0, fetchLimit));
          fetchedImagesCount += images1.result.length;
        }

        if (fetchedImagesCount < imageCount) {
          const images2 = await searchPinterest(`${query} 1`);
          if (images2.result) {
            allImages.push(...images2.result.slice(0, fetchLimit));
            fetchedImagesCount += images2.result.length;
          }
        }

        if (fetchedImagesCount >= imageCount) break;
      }

      const finalImages = allImages.slice(0, imageCount);

      if (finalImages.length > 0) {
        const filePaths = await downloadImages(finalImages);
        await sendMessage(senderId, {
          body: `Here are the top ${finalImages.length} images for "${query}".`,
          attachment: filePaths.map((filePath) => fs.createReadStream(filePath)),
        }, pageAccessToken);

        cleanupFiles(filePaths);
      } else {
        await sendMessage(senderId, { text: `I couldn't find any images for "${query}".` }, pageAccessToken);
      }

    } catch (error) {
      console.error('Error accessing Pinterest or downloading images:', error);
      await sendMessage(senderId, { text: 'There was an error accessing Pinterest or downloading the images. Please try again later.' }, pageAccessToken);
    }
  }
};

// Fonction pour rechercher des images sur Pinterest
async function searchPinterest(query) {
  const apiUrl = `https://example.com/api/searchPinterest?q=${encodeURIComponent(query)}`;
  const response = await axios.get(apiUrl);
  return response.data;
}

// Fonction pour télécharger les images
async function downloadImages(imageUrls) {
  const filePaths = [];
  const cachePath = './plugins/commands/cache';

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const filePath = path.join(cachePath, `image${i}.jpg`);
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    filePaths.push(filePath);
  }

  return filePaths;
}

// Fonction pour nettoyer les fichiers temporaires
function cleanupFiles(filePaths) {
  filePaths.forEach((filePath) => fs.unlinkSync(filePath));
}
