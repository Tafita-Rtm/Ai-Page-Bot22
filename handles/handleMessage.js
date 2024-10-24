const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('./sendMessage');

const commands = new Map();
const userStates = new Map(); // Suivi des états des utilisateurs

// Charger les commandes
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name, command);
}

// Fonction principale pour gérer les messages entrants
async function handleMessage(event, pageAccessToken) {
  const senderId = event.sender.id;

  if (event.message.attachments && event.message.attachments[0].type === 'image') {
    const imageUrl = event.message.attachments[0].payload.url;
    await handleImage(senderId, imageUrl, pageAccessToken, sendMessage);
  } else if (event.message.text) {
    const messageText = event.message.text.trim();
    await handleText(senderId, messageText, pageAccessToken, sendMessage);
  }
}

// Fonction pour gérer les images
async function handleImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    await sendMessage(senderId, { text: '🖼️ Vous avez envoyé une image ! Que voulez-vous que je fasse avec ? (analyse, détection, etc.)' }, pageAccessToken);
    userStates.set(senderId, { mode: 'image_discussion', imageUrl }); // Activer le mode d'analyse d'image
  } catch (error) {
    console.error('Erreur lors de la gestion de l\'image :', error);
    await sendMessage(senderId, { text: '😔 Erreur lors de la gestion de l\'image.' }, pageAccessToken);
  }
}

// Fonction pour gérer les textes
async function handleText(senderId, text, pageAccessToken, sendMessage) {
  const args = text.split(' ');
  const commandName = args.shift().toLowerCase();
  const command = commands.get(commandName);
  const userState = userStates.get(senderId);

  if (command) {
    // Exécuter la commande si elle est trouvée
    try {
      await command.execute(senderId, args, pageAccessToken, sendMessage);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
      await sendMessage(senderId, { text: `Erreur lors de l'exécution de la commande ${commandName}.` }, pageAccessToken);
    }
  } else if (userState && userState.mode === 'image_discussion') {
    // L'utilisateur est en mode image
    if (text.toLowerCase() === 'stop') {
      // Arrêter la discussion sur l'image
      userStates.set(senderId, { mode: 'general_discussion' });
      await sendMessage(senderId, { text: '🚫 Fin de la discussion sur l\'image. Vous pouvez maintenant poser d\'autres questions.' }, pageAccessToken);
    } else {
      // Continuer avec l'analyse de l'image
      await handleImageDiscussion(senderId, userState.imageUrl, text, pageAccessToken, sendMessage);
    }
  } else {
    // Si aucune commande trouvée et pas en mode image
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      try {
        await gpt4oCommand.execute(senderId, [text], pageAccessToken, sendMessage);
      } catch (error) {
        console.error('Erreur avec GPT-4o :', error);
        await sendMessage(senderId, { text: 'Erreur lors de l\'utilisation de GPT-4o.' }, pageAccessToken);
      }
    } else {
      await sendMessage(senderId, { text: "Je n'ai pas pu traiter votre demande." }, pageAccessToken);
    }
  }
}

// Fonction pour gérer l'analyse des images avec Gemini
async function handleImageDiscussion(senderId, imageUrl, userQuery, pageAccessToken, sendMessage) {
  try {
    await sendMessage(senderId, { text: '🔍 Analyse en cours... ⏳' }, pageAccessToken);

    const response = await analyzeImageWithGemini(imageUrl, userQuery);
    if (response) {
      await sendMessage(senderId, { text: `📸 Résultat de l'image :\n${response}` }, pageAccessToken);
    } else {
      await sendMessage(senderId, { text: "Je n'ai pas pu obtenir de réponse concernant cette image." }, pageAccessToken);
    }
  } catch (error) {
    console.error('Erreur avec Gemini :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
  }
}

// Fonction pour appeler l'API Gemini
async function analyzeImageWithGemini(imageUrl, userQuery) {
  const geminiApiEndpoint = 'https://sandipbaruwal.onrender.com/gemini2'; 

  try {
    const response = await axios.get(`${geminiApiEndpoint}?url=${encodeURIComponent(imageUrl)}&query=${encodeURIComponent(userQuery)}`);
    return response.data && response.data.answer ? response.data.answer : '';
  } catch (error) {
    console.error('Erreur avec Gemini :', error);
    throw new Error('Erreur lors de l\'analyse avec Gemini');
  }
}

module.exports = { handleMessage };
