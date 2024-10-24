const axios = require('axios');

module.exports = {
  name: 'gemini',
  description: 'Chat avec Gemini ou génère une image',
  author: 'vex_kshitiz',

  async execute(senderId, args, pageAccessToken, sendMessage, event = null) {
    const prompt = args.join(' ').trim();

    // Vérifie si une image est envoyée directement dans le message
    if (event?.attachments?.length > 0) {
      try {
        // Si une image est envoyée, la décrire automatiquement
        const photoUrl = event.attachments[0].url;
        const description = await describeImage(prompt || "Décris cette image", photoUrl);
        const formattedResponse = `👩‍💻 | 𝙶𝚎𝚖𝚒𝚗𝚒 |\n━━━━━━━━━━━━━━━━\nDescription: ${description}\n━━━━━━━━━━━━━━━━`;
        await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
      } catch (error) {
        console.error('Erreur lors de la description de l’image:', error);
        await sendMessage(senderId, { text: 'Désolé, une erreur est survenue lors de la description de l’image.' }, pageAccessToken);
      }
      return;
    }

    if (!prompt) {
      return sendMessage(senderId, { text: "👩‍💻 | 𝙶𝚎𝚖𝚒𝚗𝚒 |\n━━━━━━━━━━━━━━━━\nVeuillez fournir un prompt ou envoyer une image.\n━━━━━━━━━━━━━━━━" }, pageAccessToken);
    }

    try {
      if (args[0]?.toLowerCase() === "draw") {
        // Générer une image
        await sendMessage(senderId, { text: '💬 *Gemini est en train de générer une image* ⏳...\n\n─────★─────' }, pageAccessToken);
        
        const imageUrl = await generateImage(prompt);
        const imagePath = path.join(__dirname, 'cache', `image_${Date.now()}.png`);
        const writer = fs.createWriteStream(imagePath);
        
        const { data } = await axios({ url: imageUrl, method: 'GET', responseType: 'stream' });
        data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        await sendMessage(senderId, {
          text: '👩‍💻 | 𝙶𝚎𝚖𝚒𝚗𝚒 |\n━━━━━━━━━━━━━━━━\nImage générée :',
          attachment: fs.createReadStream(imagePath)
        }, pageAccessToken);
        
      } else {
        // Obtenir une réponse textuelle
        await sendMessage(senderId, { text: '💬 *Gemini est en train de te répondre* ⏳...\n\n─────★─────' }, pageAccessToken);
        const response = await getTextResponse(prompt, senderId);
        const formattedResponse = `─────★─────\n✨ Gemini 🤖\n\n${response}\n─────★─────`;

        // Gérer les réponses longues
        const maxMessageLength = 2000;
        if (formattedResponse.length > maxMessageLength) {
          const messages = splitMessageIntoChunks(formattedResponse, maxMessageLength);
          for (const message of messages) {
            await sendMessage(senderId, { text: message }, pageAccessToken);
          }
        } else {
          await sendMessage(senderId, { text: formattedResponse }, pageAccessToken);
        }
      }

    } catch (error) {
      console.error('Erreur lors de l’appel API Gemini:', error);
      await sendMessage(senderId, { text: 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.' }, pageAccessToken);
    }
  }
};

// Fonction pour obtenir une description d'image via l'API
async function describeImage(prompt, photoUrl) {
  try {
    const { data } = await axios.get(`https://sandipbaruwal.onrender.com/gemini2?prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(photoUrl)}`);
    return data.answer;
  } catch (error) {
    throw new Error('Erreur lors de la description de l’image');
  }
}

// Fonction pour obtenir une réponse textuelle via l'API
async function getTextResponse(prompt, senderId) {
  try {
    const { data } = await axios.get(`https://gemini-ai-pearl-two.vercel.app/kshitiz?prompt=${encodeURIComponent(prompt)}&uid=${senderId}&apikey=kshitiz`);
    return data.answer;
  } catch (error) {
    throw new Error('Erreur lors de l’appel API Gemini pour la réponse textuelle');
  }
}

// Fonction pour découper les messages trop longs
function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  return chunks;
}

// Fonction pour générer une image
async function generateImage(prompt) {
  try {
    const { data } = await axios.get(`https://sdxl-kshitiz.onrender.com/gen?prompt=${encodeURIComponent(prompt)}&style=3`);
    return data.url;
  } catch (error) {
    throw new Error('Erreur lors de la génération de l’image');
  }
}
