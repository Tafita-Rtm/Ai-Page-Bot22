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

// Gestion des images avec interaction via Gemini
async function handleImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    // Envoyer un message pour informer que l'image est en cours d'analyse
    await sendMessage(senderId, { text: '🖼️ analyse d\'image ... Veuillez patienter ⏳' }, pageAccessToken);

    // Analyser l'image avec Gemini (remplacez l'URL de l'API par l'API de Gemini)
    const description = await analyzeImageWithGemini(imageUrl);

    if (!description) {
      await sendMessage(senderId, { text: "Je n'ai pas pu analyser cette image." }, pageAccessToken);
      return;
    }

    // Envoyer la description générée par Gemini
    await sendMessage(senderId, { text: `Description de l'image :\n${description}` }, pageAccessToken);

  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec Gemini :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
  }
}

// Fonction pour analyser une image avec Gemini
async function analyzeImageWithGemini(imageUrl) {
  const geminiApiEndpoint = 'https://sandipbaruwal.onrender.com/gemini2'; // L'URL de l'API Gemini

  try {
    const response = await axios.get(`${geminiApiEndpoint}?url=${encodeURIComponent(imageUrl)}`);
    
    if (response.data && response.data.answer) {
      return response.data.answer;
    }

    return '';
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec Gemini :', error);
    throw new Error('Erreur lors de l\'analyse avec Gemini');
  }
}

// Gestion des textes envoyés
async function handleText(senderId, text, pageAccessToken, sendMessage) {
  const args = text.split(' '); // Diviser le texte en arguments
  const commandName = args.shift().toLowerCase(); // Récupérer le premier mot comme commande

  const command = commands.get(commandName);
  const userState = userStates.get(senderId); // Récupérer l'état de l'utilisateur (texte extrait)

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
        // Ajouter le texte extrait au message si disponible
        const contextText = userState ? userState.extractedText : '';
        const fullMessage = contextText ? `${contextText}\n\n${text}` : text;

        await gpt4oCommand.execute(senderId, [fullMessage], pageAccessToken, sendMessage); // Envoyer le texte avec le contexte extrait à GPT-4o
      } catch (error) {
        console.error('Erreur lors de l\'utilisation de GPT-4o:', error);
        await sendMessage(senderId, { text: 'Erreur lors de l\'utilisation de GPT-4o.' }, pageAccessToken);
      }
    } else {
      await sendMessage(senderId, { text: "Impossible de trouver le service GPT-4o." }, pageAccessToken);
    }
  }
}

module.exports = { handleMessage };
