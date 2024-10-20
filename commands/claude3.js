const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Fonction pour s'assurer que le répertoire "temp" existe
function ensureTempDirectory() {
    const tempDir = path.resolve(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    return tempDir;
}

module.exports = {
    name: 'pinterest',
    description: 'Fetches Pinterest images based on a search query.',
    author: 'Deku (rest api)',
    async execute(senderId, args, pageAccessToken, sendMessage) {
        const query = args.join(' ');

        if (!query) {
            return sendMessage(senderId, { text: "❗ Veuillez fournir une requête de recherche pour les images Pinterest.\n\nExemple : pinterest cats" }, pageAccessToken);
        }

        try {
            // Envoyer un message indiquant que la recherche est en cours
            await sendMessage(senderId, { text: '🔍 *Recherche d\'images sur Pinterest* ⏳...\n\n─────★─────' }, pageAccessToken);

            // Requête à l'API pour récupérer des images
            const apiUrl = `https://deku-rest-apis.ooguy.com/api/pinterest?q=${encodeURIComponent(query)}`;
            const response = await axios.get(apiUrl);
            const images = response.data.result;

            // Vérifier si des images ont été trouvées
            if (!images || images.length === 0) {
                return sendMessage(senderId, { text: "Aucune image trouvée pour votre requête." }, pageAccessToken);
            }

            // Créer un message pour indiquer que les images sont en cours d'envoi
            const formattedResponse = `─────★─────\n` +
                                      `✨Images Pinterest pour : "${query}"\n\n` +
                                      `─────★─────`;
            await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

            // Assurer que le répertoire temp existe
            const tempDir = ensureTempDirectory();

            // Télécharger et envoyer chaque image
            for (const imageUrl of images) {
                const imagePath = path.join(tempDir, `${Date.now()}.jpg`);
                const writer = fs.createWriteStream(imagePath);

                const imageResponse = await axios.get(imageUrl, { responseType: 'stream' });
                imageResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                // Envoyer l'image téléchargée
                await sendMessage(senderId, {
                    attachment: fs.createReadStream(imagePath)
                }, pageAccessToken);

                // Supprimer le fichier temporaire après envoi
                fs.unlinkSync(imagePath);
            }

        } catch (error) {
            console.error('Erreur lors de l\'appel à l\'API Pinterest:', error);
            // Message de réponse d'erreur
            await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
        }
    }
};
