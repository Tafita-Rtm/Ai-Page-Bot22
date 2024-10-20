const axios = require('axios');

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

            // Préparer le message formaté avec les images
            const formattedResponse = `─────★─────\n` +
                                      `✨Images Pinterest pour : "${query}"\n\n` +
                                      `─────★─────`;

            await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);

            // Envoi des images une par une
            for (const imageUrl of images) {
                await sendMessage(senderId, {
                    attachment: { type: 'image', payload: { url: imageUrl } }
                }, pageAccessToken);
            }

        } catch (error) {
            console.error('Erreur lors de l\'appel à l\'API Pinterest:', error);
            // Message de réponse d'erreur
            await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
        }
    }
};
