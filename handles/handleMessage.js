const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');
const gpt4o = require('../commands/gpt4o');

// Charger dynamiquement les fichiers de commande
const commands = new Map();
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
    
    // Appeler la fonction de gestion des images de gpt4o
    await gpt4o.handleImage(senderId, imageUrl, sendMessage, pageAccessToken);
  } 
  // Sinon, traiter le texte envoyé par l'utilisateur
  else if (event.message.text) {
    const messageText = event.message.text.trim();
    const args = messageText.split(' ');

    // Appeler la fonction de gestion des textes de gpt4o
    await gpt4o.execute(senderId, args, pageAccessToken, sendMessage);
  }
}

// Fonction pour charger et exécuter des commandes
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
