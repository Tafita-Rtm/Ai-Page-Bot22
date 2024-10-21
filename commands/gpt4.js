const axios = require('axios');

module.exports = {
  name: 'chatgpt',
  description: 'Interact with GPT-4 API or analyze images',
  async execute(senderId, args, pageAccessToken, sendMessage, messageReply) {
    const query = args.join(' ') || "hi";
    const header = "(⁠•⁠ᴗ⁠•⁠) | Rtm 𝙰𝚒\n・──────────────・";
    const footer = "・───── >ᴗ< ──────・";

    // Envoyer un message indiquant que GPT-4 est en train de répondre
    await sendMessage(senderId, { text: '💬 *GPT-4 est en train de te répondre* ⏳...\n\n─────★─────' }, pageAccessToken);

    // Vérifier si une image est attachée dans la réponse
    if (messageReply && messageReply.attachments && messageReply.attachments[0]?.type === "photo") {
        const attachment = messageReply.attachments[0];
        const imageURL = attachment.url;

        const geminiUrl = `https://joncll.serv00.net/chat.php?ask=${encodeURIComponent(query)}&imgurl=${encodeURIComponent(imageURL)}`;
        try {
            const response = await axios.get(geminiUrl);
            const { vision } = response.data;

            if (vision) {
                return await sendMessage(senderId, { text: `${header}\n${vision}\n${footer}` }, pageAccessToken);
            } else {
                return await sendMessage(senderId, { text: `${header}\nFailed to recognize the image.\n${footer}` }, pageAccessToken);
            }
        } catch (error) {
            console.error("Error fetching image recognition:", error);
            return await sendMessage(senderId, { text: `${header}\nAn error occurred while processing the image.\n${footer}` }, pageAccessToken);
        }
    }

    // Gérer les requêtes texte avec GPT-4
    try {
        const apiUrl = `https://lorex-gpt4.onrender.com/api/gpt4?prompt=${encodeURIComponent(query)}&uid=${senderId}`;
        const { data } = await axios.get(apiUrl);

        if (data && data.response) {
            await sendMessage(senderId, { text: `${header}\n${data.response}\n${footer}` }, pageAccessToken);
        } else {
            await sendMessage(senderId, { text: `${header}\nSorry, I couldn't get a response from the API.\n${footer}` }, pageAccessToken);
        }
    } catch (error) {
        console.error("Error fetching from GPT-4 API:", error);
        await sendMessage(senderId, { text: `${header}\nAn error occurred while trying to reach the API.\n${footer}` }, pageAccessToken);
    }
  }
};
