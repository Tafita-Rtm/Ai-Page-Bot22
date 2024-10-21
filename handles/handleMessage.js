const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('./sendMessage');

const commands = new Map();

// Charger les fichiers de commande
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name, command);
}

async function handleMessage(event, pageAccessToken) {
  const senderId = event.sender.id;

  // Vérifier si le message contient une image
  if (event.message.attachments && event.message.attachments[0].type === 'image') {
    const imageUrl = event.message.attachments[0].payload.url;
    await handleImage(senderId, imageUrl, pageAccessToken, sendMessage);
  } else if (event.message.text) {
    const messageText = event.message.text.toLowerCase();
    const args = messageText.split(' ');
    const commandName = args.shift();

    // Exécuter la commande si elle existe
    if (commands.has(commandName)) {
      const command = commands.get(commandName);
      try {
        await command.execute(senderId, args, pageAccessToken, sendMessage);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
        await sendMessage(senderId, { text: 'Erreur lors de l\'exécution de la commande.' }, pageAccessToken);
      }
    }
  }
}

async function handleImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    // Informer l'utilisateur que l'analyse de l'image est en cours
    await sendMessage(senderId, { text: '🖼️ Analyzing the image... Please wait ⏳' }, pageAccessToken);

    // Analyser l'image avec OCR.Space
    const extractedText = await analyzeImageWithOCROnline(imageUrl, 'VOTRE_API_KEY_OCR_SPACE');

    if (!extractedText) {
      await sendMessage(senderId, { text: "Je n'ai pas pu extraire de texte de cette image." }, pageAccessToken);
      return;
    }

    // Envoyer le texte extrait à GPT-4o pour analyse
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      await gpt4oCommand.execute(senderId, [extractedText], pageAccessToken, sendMessage);
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec OCR et GPT-4o :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
  }
}

async function analyzeImageWithOCROnline(imageUrl, apiKey) {
  try {
    const response = await axios.post('https://api.ocr.space/parse/image', null, {
      params: {
        apikey: apiKey,
        url: imageUrl,
        language: 'eng',
      },
    });

    if (response.data.IsErroredOnProcessing) {
      throw new Error(response.data.ErrorMessage[0]);
    }

    return response.data.ParsedResults[0].ParsedText || '';
  } catch (error) {
    console.error('Erreur lors de l\'analyse OCR :', error);
    throw new Error('Erreur lors de l\'analyse OCR en ligne');
  }
}

module.exports = { handleMessage };
