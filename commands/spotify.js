const axios = require('axios');

async function gpt4o(q, uid) {
    try {
        const response = await axios.get(`${global.NashBot.JOSHUA}gpt4o-v2?ask=${encodeURIComponent(q)}&id=${uid}`);
        if (response.data.status) {
            return response.data.response;
        } else {
            return "Failed to get a proper response.";
        }
    } catch (error) {
        console.error("Error fetching data:", error.message);
        return "Failed to fetch data. Please try again later.";
    }
}

module.exports = {
    name: 'gpt5o',
    description: 'Talk to GPT-4 (v2 conversational)',
    author: 'Deku (rest api)',
    async execute(senderId, args, pageAccessToken, sendMessage) {
        const prompt = args.join(' ');

        if (!prompt) {
            return sendMessage(senderId, { text: "Veuillez entrer une question valide." }, pageAccessToken);
        }

        try {
            // Envoyer un message indiquant que GPT-4 est en train de répondre
            await sendMessage(senderId, { text: '💬 *GPT-4 est en train de te répondre* ⏳...\n\n─────★─────' }, pageAccessToken);

            // Obtenir la réponse de l'API GPT-4
            const response = await gpt4o(prompt, senderId);

            // Créer un style avec un contour pour la réponse de GPT-4
            const formattedResponse = `─────★─────\n` +
                                      `✨Gpt4o v2 Conversational🤖\n\n${response}\n` +
                                      `─────★─────`;

            // Gérer les réponses longues de plus de 2000 caractères
            const maxMessageLength = 2000;
            if (formattedResponse.length > maxMessageLength) {
                const messages = splitMessageIntoChunks(formattedResponse, maxMessageLength);
                for (const message of messages) {
                    await sendMessage(senderId, { text: message }, pageAccessToken);
                }
            } else {
                await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
            }

        } catch (error) {
            console.error('Error processing GPT-4 response:', error);
            // Message de réponse d'erreur
            await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
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
