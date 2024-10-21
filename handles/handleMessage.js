const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('./sendMessage');

const commands = new Map();

// Charger dynamiquement les fichiers de commande
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
    const messageText = event.message.text.trim();
    await handleText(senderId, messageText, pageAccessToken, sendMessage);
  }
}

async function handleImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    await sendMessage(senderId, { text: '🖼️ Analyzing the image... Please wait ⏳' }, pageAccessToken);

    // Analyser l'image avec OCR.space
    const extractedText = await analyzeImageWithOCRSpace(imageUrl);

    if (!extractedText) {
      await sendMessage(senderId, { text: "Je n'ai pas pu extraire de texte de cette image." }, pageAccessToken);
      return;
    }

    // Si du texte a été extrait, exécuter la commande GPT-4o
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      await gpt4oCommand.execute(senderId, [extractedText], pageAccessToken, sendMessage);
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec OCR.space et GPT-4o :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
  }
}

async function handleText(senderId, text, pageAccessToken, sendMessage) {
  const args = text.split(' '); // Diviser le texte en arguments

  const commandName = args.shift().toLowerCase(); // Récupérer la commande

  const command = commands.get(commandName);

  if (command) {
    try {
      await command.execute(senderId, args, pageAccessToken, sendMessage); // Exécuter la commande avec les arguments
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
      await sendMessage(senderId, { text: `Erreur lors de l'exécution de la commande ${commandName}.` }, pageAccessToken);
    }
  } else {
    // Si la commande n'existe pas, envoyer une réponse d'erreur
    await sendMessage(senderId, { text: `Commande inconnue : ${commandName}` }, pageAccessToken);
  }
}

async function analyzeImageWithOCRSpace(imageUrl) {
  const apiKey = 'K87729656488957'; // Remplacez par votre clé d'API OCR.space
  const ocrApiEndpoint = 'https://api.ocr.space/parse/image';

  try {
    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('url', imageUrl);
    formData.append('language', 'eng'); // ou 'fre' pour le français

    const response = await axios.post(ocrApiEndpoint, formData);

    if (response.data.IsErroredOnProcessing) {
      throw new Error(response.data.ErrorMessage[0]);
    }

    // Extraire le texte détecté
    const parsedResults = response.data.ParsedResults;
    if (parsedResults && parsedResults.length > 0) {
      return parsedResults[0].ParsedText.trim();
    }

    return '';
  } catch (error) {
    console.error('Erreur lors de l\'analyse OCR avec OCR.space :', error);
    throw new Error('Erreur lors de l\'analyse avec OCR.space');
  }
}

module.exports = { handleMessage };
