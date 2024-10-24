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
    await askImagePurpose(senderId, imageUrl, pageAccessToken, sendMessage);
  } else if (event.message.text) {
    const messageText = event.message.text.trim();
    await handleText(senderId, messageText, pageAccessToken, sendMessage);
  }
}

// Poser des questions sur l'utilisation de l'image
async function askImagePurpose(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    // Envoyer un message pour demander ce que l'utilisateur souhaite faire avec l'image
    await sendMessage(senderId, { text: 'Que souhaitez-vous faire avec cette image ?\n1. Analyser l\'image\n2. Répondre à une question\n3. Discuter à propos de l\'image' }, pageAccessToken);

    // Stocker l'état de l'utilisateur pour attendre sa réponse
    userStates.set(senderId, { step: 'await_image_action', imageUrl });
  } catch (error) {
    console.error('Erreur lors de la demande d\'action pour l\'image :', error);
    await sendMessage(senderId, { text: 'Erreur lors de la gestion de votre demande.' }, pageAccessToken);
  }
}

// Gestion des réponses en fonction de l'étape
async function handleText(senderId, text, pageAccessToken, sendMessage) {
  const userState = userStates.get(senderId);

  if (userState && userState.step === 'await_image_action') {
    await handleImageAction(senderId, text, userState.imageUrl, pageAccessToken, sendMessage);
  } else {
    // Si l'utilisateur ne se trouve pas dans une étape spécifique, envoyer la question à GPT-4o
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      try {
        await gpt4oCommand.execute(senderId, [text], pageAccessToken, sendMessage);
      } catch (error) {
        console.error('Erreur lors de l\'utilisation de GPT-4o:', error);
        await sendMessage(senderId, { text: 'Erreur lors de l\'utilisation de GPT-4o.' }, pageAccessToken);
      }
    } else {
      await sendMessage(senderId, { text: "Impossible de trouver le service GPT-4o." }, pageAccessToken);
    }
  }
}

// Gestion de l'action choisie par l'utilisateur pour l'image
async function handleImageAction(senderId, action, imageUrl, pageAccessToken, sendMessage) {
  try {
    switch (action) {
      case '1': // Analyser l'image
        await analyzeImage(senderId, imageUrl, pageAccessToken, sendMessage);
        break;
      case '2': // Répondre à une question sur l'image
        await sendMessage(senderId, { text: 'Quelle question avez-vous à propos de cette image ?' }, pageAccessToken);
        userStates.set(senderId, { step: 'await_image_question', imageUrl });
        break;
      case '3': // Discuter à propos de l'image
        await sendMessage(senderId, { text: 'D\'accord, nous pouvons discuter de cette image. Que voulez-vous savoir ou dire à son propos ?' }, pageAccessToken);
        userStates.set(senderId, { step: 'await_image_discussion', imageUrl });
        break;
      default:
        await sendMessage(senderId, { text: 'Option non valide. Veuillez choisir 1, 2 ou 3.' }, pageAccessToken);
    }
  } catch (error) {
    console.error('Erreur lors de la gestion de l\'action pour l\'image :', error);
    await sendMessage(senderId, { text: 'Erreur lors de la gestion de votre demande.' }, pageAccessToken);
  }
}

// Fonction pour analyser une image
async function analyzeImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    await sendMessage(senderId, { text: '🖼️ analyse d\'image ... Veuillez patienter ⏳' }, pageAccessToken);

    // Appeler l'API de Gemini pour l'analyse (remplacez l'URL par l'API réelle)
    const description = await analyzeImageWithGemini(imageUrl);

    if (description) {
      await sendMessage(senderId, { text: `Description de l'image :\n${description}` }, pageAccessToken);
    } else {
      await sendMessage(senderId, { text: "Je n'ai pas pu analyser cette image." }, pageAccessToken);
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec Gemini :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
  }
}

// Fonction pour analyser une image avec Gemini
async function analyzeImageWithGemini(imageUrl) {
  const geminiApiEndpoint = 'https://sandipbaruwal.onrender.com/gemini2'; // Remplacer par votre API

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

module.exports = { handleMessage };
