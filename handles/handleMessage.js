const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');

const commands = new Map();

// Charger tous les modules de commande dynamiquement
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name, command);
}

// Variable pour stocker le choix de l'IA (GPT-4o ou Gemini)
let iaChoice = null;

async function handleMessage(event, pageAccessToken) {
  const senderId = event.sender.id;
  const messageText = event.message.text.toLowerCase();

  const args = messageText.split(' ');
  const commandName = args.shift();

  // Si l'utilisateur demande de stopper l'automatisation
  if (messageText === 'stop') {
    iaChoice = null;
    sendMessage(senderId, { text: 'L\'automatisation de l\'IA a été arrêtée.' }, pageAccessToken);
    return;
  }

  // Si l'IA n'a pas encore été choisie
  if (!iaChoice) {
    sendMessage(senderId, {
      text: 'Choisissez une IA :',
      buttons: [
        { type: 'postback', title: 'Gemini', payload: 'gemini' },
        { type: 'postback', title: 'GPT-4o', payload: 'gpt4o' }
      ]
    }, pageAccessToken);
    return;
  }

  // Si le message ne contient aucune commande spécifique, exécuter l'IA choisie
  if (!commands.has(commandName)) {
    const selectedCommand = commands.get(iaChoice); // Utiliser l'IA sélectionnée
    if (selectedCommand) {
      try {
        await selectedCommand.execute(senderId, messageText.split(' '), pageAccessToken, sendMessage);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la commande ${iaChoice}:`, error);
        sendMessage(senderId, { text: `Désolé, une erreur est survenue avec ${iaChoice}.` }, pageAccessToken);
      }
    }
  } else {
    // Si une commande spécifique est utilisée, continuer à l'utiliser
    const command = commands.get(commandName);
    try {
      await command.execute(senderId, args, pageAccessToken, sendMessage);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
      sendMessage(senderId, { text: 'Il y a eu une erreur lors de l\'exécution de cette commande.' }, pageAccessToken);
    }
  }
}

// Gestion du choix d'IA lors du clic sur les boutons flottants
async function handlePostback(event, pageAccessToken) {
  const senderId = event.sender.id;
  const payload = event.postback.payload;

  if (payload === 'gemini' || payload === 'gpt4o') {
    iaChoice = payload; // Enregistrer l'IA choisie
    sendMessage(senderId, { text: `Vous avez choisi ${payload}.` }, pageAccessToken);
  }
}

module.exports = { handleMessage, handlePostback };
