const axios = require('axios');

// Fonction pour appeler l'API GPT-convo
async function gptConvoAPI(ask, id) {
    try {
        const response = await axios.get(`https://jonellccprojectapis10.adaptable.app/api/gptconvo?ask=${encodeURIComponent(ask)}&id=${id}`);
        if (response.data && response.data.response) {
            return response.data.response;
        } else {
            return "Unexpected API response format. Please check the API or contact support.";
        }
    } catch (error) {
        console.error("Error fetching data:", error.message);
        return "Failed to fetch data. Please try again later.";
    }
}

module.exports = {
    name: 'ai3',
    description: 'Interact with GPT-3 conversational AI and image recognition',
    author: 'Deku (rest api)',
    async execute(senderId, args, pageAccessToken, sendMessage) {
        const message = args.join(' ');

        if (!message) {
            return sendMessage(senderId, {
                text: "Please provide your question.\n\nExample: ai What is the solar system?"
            }, pageAccessToken);
        }

        try {
            // Envoi d'un message indiquant que la recherche est en cours
            await sendMessage(senderId, {
                text: "🔎 Searching for an answer. Please wait..."
            }, pageAccessToken);

            // Gestion de la reconnaissance d'image si un fichier est joint au message
            if (event.type === "message_reply" && event.messageReply.attachments && event.messageReply.attachments[0]) {
                const attachment = event.messageReply.attachments[0];
                if (attachment.type === "photo") {
                    const imageURL = attachment.url;
                    const geminiUrl = `https://joncll.serv00.net/chat.php?ask=${encodeURIComponent(message)}&imgurl=${encodeURIComponent(imageURL)}`;
                    const geminiResponse = await axios.get(geminiUrl);
                    const { vision } = geminiResponse.data;

                    if (vision) {
                        return sendMessage(senderId, {
                            text: `𝗚𝗲𝗺𝗶𝗻𝗶 𝗩𝗶𝘀𝗶𝗼𝗻 𝗜𝗺𝗮𝗴𝗲 𝗥𝗲𝗰𝗼𝗴𝗻𝗶𝘁𝗶𝗼𝗻\n━━━━━━━━━━━━━━━━━━\n${vision}\n━━━━━━━━━━━━━━━━━━`
                        }, pageAccessToken);
                    } else {
                        return sendMessage(senderId, {
                            text: "🤖 Failed to recognize the image."
                        }, pageAccessToken);
                    }
                }
            }

            // Appel à l'API GPT-convo pour obtenir une réponse textuelle
            const response = await gptConvoAPI(message, senderId);
            const formattedResponse = `𝗖𝗛𝗔𝗧𝗚𝗣𝗧\n━━━━━━━━━━━━━━━━━━\n${response}\n━━━━━━━━━━━━━━━━━━`;

            // Envoi de la réponse formatée à l'utilisateur
            await sendMessage(senderId, {
                text: formattedResponse
            }, pageAccessToken);

        } catch (error) {
            console.error('Error during API request:', error);
            await sendMessage(senderId, {
                text: "An error occurred while processing your request. Please try again later."
            }, pageAccessToken);
        }
    }
};
