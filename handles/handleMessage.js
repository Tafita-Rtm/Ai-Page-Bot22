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

async function handleMessage(event, pageAccessToken) {
  const senderId = event.sender.id;

  // Vérifier si le message contient une image
  if (event.message.attachments && event.message.attachments[0].type === 'image') {
    const imageUrl = event.message.attachments[0].payload.url;

    // Si une image est envoyée, GPT-4o est utilisé pour l'analyser
    const gpt4oCommand = commands.get('gpt4o'); // Assurez-vous que gpt4o est bien défini
    if (gpt4oCommand) {
      try {
        await gpt4oCommand.handleImage(senderId, imageUrl, 'Décris cette image.', sendMessage, pageAccessToken);
      } catch (error) {
        console.error('Erreur lors de l\'analyse de l\'image avec GPT-4o:', error);
        await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
      }
    }
  } else if (event.message.text) {
    const messageText = event.message.text.toLowerCase();
    const args = messageText.split(' ');
    const commandName = args.shift();

    // Si une commande est trouvée, exécute la commande
    if (commands.has(commandName)) {
      const command = commands.get(commandName);
      try {
        await command.execute(senderId, args, pageAccessToken, sendMessage);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
        await sendMessage(senderId, { text: 'Il y a eu une erreur lors de l\'exécution de cette commande.' }, pageAccessToken);
      }
    } else {
      // Si aucune commande n'est trouvée, GPT-4o répond par défaut
      const gpt4oCommand = commands.get('gpt4o'); 
      if (gpt4oCommand) {
        try {
          await gpt4oCommand.execute(senderId, [messageText], pageAccessToken, sendMessage);
        } catch (error) {
          console.error('Erreur lors de l\'utilisation de GPT-4o:', error);
          await sendMessage(senderId, { text: 'Erreur lors de l\'utilisation de GPT-4o.' }, pageAccessToken);
        }
      }
    }
  }
}

module.exports = { handleMessage };
