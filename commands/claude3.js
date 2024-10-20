const axios = require('axios');

module.exports = {
    name: 'ai5',
    description: 'Chat with the AI',
    author: 'Deku (rest api)',
    async execute(senderId, args, pageAccessToken, sendMessage) {
        const userMessage = args.join(' ');

        if (!userMessage) {
            return sendMessage(senderId, { 
                text: "[ GPT 4o ]\n\n❗ Please provide a message to chat with the AI.\n\nExample: ai5 Hello!" 
            }, pageAccessToken);
        }

        try {
            // Envoyer un message indiquant que le traitement est en cours
            await sendMessage(senderId, { 
                text: "[ GPT 4o ]\n\n⏳ Please wait while I process your request..." 
            }, pageAccessToken);

            // Requête à l'API pour obtenir la réponse de l'IA
            const apiUrl = 'https://free-ai-models.vercel.app/v1/chat/completions';
            const response = await axios.post(apiUrl, {
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are AI(gpt4-o)' },
                    { role: 'user', content: userMessage }
                ]
            });

            const aiResponse = response.data.response;

            // Formatage de la réponse de l'IA
            const formattedResponse = `─────★─────\n` +
                                      `✨GPT-4o mini🤖🇲🇬\n\n${aiResponse}\n` +
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
            console.error('Error calling GPT-4o API:', error);
            // Message de réponse d'erreur
            await sendMessage(senderId, { 
                text: '[ GPT 4o ]\n\n❌ Error: Unable to process your request. Please try again later.' 
            }, pageAccessToken);
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
