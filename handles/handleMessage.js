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
    await sendMessage(senderId, { text: '🖼️ J\'analyse l\'image... Veuillez patienter ⏳' }, pageAccessToken);
    const extractedText = await analyzeImageWithOCRSpace(imageUrl);

    if (!extractedText) {
      await sendMessage(senderId, { text: "Je n'ai pas pu extraire de texte de cette image." }, pageAccessToken);
      return;
    }

    userStates.set(senderId, { extractedText });
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      await gpt4oCommand.execute(senderId, [extractedText], pageAccessToken, sendMessage);
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec OCR.space :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
  }
}

// Gestion des textes envoyés et ajout des boutons flottants
async function handleText(senderId, text, pageAccessToken, sendMessage) {
  const args = text.split(' ');
  const commandName = args.shift().toLowerCase();
  const command = commands.get(commandName);
  const userState = userStates.get(senderId);

  if (command) {
    try {
      await command.execute(senderId, args, pageAccessToken, sendMessage);
      // Ajouter des boutons pour interagir avec la commande
      await sendButtonsForCommand(senderId, commandName, pageAccessToken, sendMessage);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
      await sendMessage(senderId, { text: `Erreur lors de l'exécution de la commande ${commandName}.` }, pageAccessToken);
    }
  } else {
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      try {
        const contextText = userState ? userState.extractedText : '';
        const fullMessage = contextText ? `${contextText}\n\n${text}` : text;

        await gpt4oCommand.execute(senderId, [fullMessage], pageAccessToken, sendMessage);

        // Envoyer le bouton stop après chaque réponse de GPT-4o
        await sendStopButton(senderId, pageAccessToken, sendMessage);
      } catch (error) {
        console.error('Erreur lors de l\'utilisation de GPT-4o:', error);
        await sendMessage(senderId, { text: 'Erreur lors de l\'utilisation de GPT-4o.' }, pageAccessToken);
      }
    } else {
      await sendMessage(senderId, { text: "Impossible de trouver le service GPT-4o." }, pageAccessToken);
    }
  }
}

// Fonction pour envoyer des boutons flottants pour chaque commande
async function sendButtonsForCommand(senderId, commandName, pageAccessToken, sendMessage) {
  const buttons = [
    {
      type: 'postback',
      title: `Discuter avec ${commandName}`,
      payload: commandName
    },
    {
      type: 'postback',
      title: 'Stop',
      payload: 'stop'
    }
  ];

  await sendMessage(senderId, {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: `Vous avez utilisé la commande ${commandName}. Voulez-vous continuer ou arrêter ?`,
        buttons: buttons
      }
    }
  }, pageAccessToken);
}

// Fonction pour envoyer le bouton "Stop"
async function sendStopButton(senderId, pageAccessToken, sendMessage) {
  const stopButton = [
    {
      type: 'postback',
      title: 'Stop',
      payload: 'stop'
    }
  ];

  await sendMessage(senderId, {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: 'Voulez-vous arrêter la discussion ?',
        buttons: stopButton
      }
    }
  }, pageAccessToken);
}

// Fonction pour analyser une image avec OCR.space
async function analyzeImageWithOCRSpace(imageUrl) {
  const apiKey = 'K87729656488957'; // Remplacez par votre clé d'API OCR.space
  const ocrApiEndpoint = 'https://api.ocr.space/parse/image';

  try {
    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('url', imageUrl);
    formData.append('language', 'eng');

    const response = await axios.post(ocrApiEndpoint, formData);

    if (response.data.IsErroredOnProcessing) {
      throw new Error(response.data.ErrorMessage[0]);
    }

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
