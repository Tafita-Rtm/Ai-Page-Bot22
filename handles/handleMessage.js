const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');

const commands = new Map();

// Charger tous les fichiers de commande dynamiquement
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name, command);
}

let userChoice = {};  // Stocker le choix de l'utilisateur pour chaque session

async function handleMessage(event, pageAccessToken) {
  const senderId = event.sender.id;

  // Vérifier si le message contient une image
  if (event.message.attachments && event.message.attachments[0].type === 'image') {
    const imageUrl = event.message.attachments[0].payload.url;
    console.log(`Image reçue: ${imageUrl}`);

    // Appel à la commande Gemini pour traiter l'image
    const geminiCommand = commands.get('gemini');
    if (geminiCommand) {
      try {
        const query = "Décris cette image.";
        await geminiCommand.execute(senderId, [query, imageUrl], pageAccessToken, sendMessage);
      } catch (error) {
        console.error('Erreur lors de l\'analyse de l\'image avec Gemini:', error);
        sendMessage(senderId, { text: 'Désolé, je n\'ai pas pu analyser l\'image.' }, pageAccessToken);
      }
    }
  } else if (event.message.text) {
    const messageText = event.message.text.toLowerCase();

    // Si l'utilisateur tape "stop", on arrête et on demande à nouveau quel service utiliser
    if (messageText === 'stop') {
      delete userChoice[senderId];  // Réinitialiser le choix de l'utilisateur
      return sendMessage(senderId, { text: "Choisissez entre 'gpt4o' ou 'gemini' pour traiter votre prochaine question." }, pageAccessToken);
    }

    // Vérifier si l'utilisateur a déjà fait un choix
    if (!userChoice[senderId]) {
      return sendMessage(senderId, { text: "Voulez-vous utiliser 'gpt4o' ou 'gemini' pour cette question ?" }, pageAccessToken);
    }

    // Utiliser GPT-4o ou Gemini selon le choix précédent de l'utilisateur
    const service = userChoice[senderId];

    if (service === 'gpt4o') {
      const gpt4oCommand = commands.get('gpt4o');
      if (gpt4oCommand) {
        try {
          await gpt4oCommand.execute(senderId, [messageText], pageAccessToken, sendMessage);
        } catch (error) {
          console.error('Erreur lors de l\'utilisation de GPT-4o:', error);
          sendMessage(senderId, { text: 'Désolé, il y a eu une erreur avec GPT-4o.' }, pageAccessToken);
        }
      }
    } else if (service === 'gemini') {
      const geminiCommand = commands.get('gemini');
      if (geminiCommand) {
        try {
          const query = messageText;  // L'utilisateur peut poser des questions à Gemini
          await geminiCommand.execute(senderId, [query], pageAccessToken, sendMessage);
        } catch (error) {
          console.error('Erreur lors de l\'utilisation de Gemini:', error);
          sendMessage(senderId, { text: 'Désolé, il y a eu une erreur avec Gemini.' }, pageAccessToken);
        }
      }
    }
  } else {
    sendMessage(senderId, { text: 'Désolé, je ne peux répondre qu\'à des messages texte ou à des images.' }, pageAccessToken);
  }
}

// Gestion du choix de l'utilisateur entre GPT-4o ou Gemini
async function chooseService(senderId, pageAccessToken, messageText) {
  const service = messageText.toLowerCase();
  if (service === 'gpt4o' || service === 'gemini') {
    userChoice[senderId] = service;  // Stocker le choix de l'utilisateur
    sendMessage(senderId, { text: `Vous avez choisi d'utiliser ${service.toUpperCase()}.` }, pageAccessToken);
  } else {
    sendMessage(senderId, { text: "Choix invalide. Veuillez taper 'gpt4o' ou 'gemini'." }, pageAccessToken);
  }
}

module.exports = { handleMessage };
