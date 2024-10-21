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

// Stocker temporairement les états des utilisateurs pour suivre les étapes interactives
const userStates = new Map();

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

// Gestion des images avec interaction
async function handleImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    // Envoyer un message pour informer que l'image est en cours d'analyse
    await sendMessage(senderId, { text: '🖼️ J\'analyse l\'image... Veuillez patienter ⏳' }, pageAccessToken);

    // Analyser l'image avec OCR.space
    const extractedText = await analyzeImageWithOCRSpace(imageUrl);

    if (!extractedText) {
      await sendMessage(senderId, { text: "Je n'ai pas pu extraire de texte de cette image." }, pageAccessToken);
      return;
    }

    // Envoyer le texte extrait directement à GPT-4o
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      await gpt4oCommand.execute(senderId, [extractedText], pageAccessToken, sendMessage); // GPT-4o traite le texte extrait
    }

  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec OCR.space :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
  }
}

// Gestion des textes envoyés
async function handleText(senderId, text, pageAccessToken, sendMessage) {
  const args = text.split(' '); // Diviser le texte en arguments
  const commandName = args.shift().toLowerCase(); // Récupérer le premier mot comme commande

  const command = commands.get(commandName);

  if (command) {
    // Si une commande est trouvée, l'exécuter
    try {
      await command.execute(senderId, args, pageAccessToken, sendMessage); // Exécuter la commande avec les arguments
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
      await sendMessage(senderId, { text: `Erreur lors de l'exécution de la commande ${commandName}.` }, pageAccessToken);
    }
  } else {
    // Si aucune commande n'est trouvée, envoyer la question directement à GPT-4o
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      try {
        await gpt4oCommand.execute(senderId, [text], pageAccessToken, sendMessage); // Envoyer le texte sans commande à GPT-4o
      } catch (error) {
        console.error('Erreur lors de l\'utilisation de GPT-4o:', error);
        await sendMessage(senderId, { text: 'Erreur lors de l\'utilisation de GPT-4o.' }, pageAccessToken);
      }
    } else {
      await sendMessage(senderId, { text: "Impossible de trouver le service GPT-4o." }, pageAccessToken);
    }
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
