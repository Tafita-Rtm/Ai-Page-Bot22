const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');

const commands = new Map();

// Load all command modules dynamically
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name, command);
}

async function handleMessage(event, pageAccessToken) {
  const senderId = event.sender.id;
  const messageText = event.message.text.toLowerCase();

  const args = messageText.split(' ');
  const commandName = args.shift();

  // Si le message ne contient aucune commande, faire appel à GPT-4o par défaut
  if (!commands.has(commandName)) {
    // Utiliser GPT-4o sans la commande
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      try {
        await gpt4oCommand.execute(senderId, messageText.split(' '), pageAccessToken, sendMessage);
      } catch (error) {
        console.error(`Error executing GPT-4o command:`, error);
        sendMessage(senderId, { text: 'Désolé, une erreur est survenue lors de l\'utilisation de GPT-4o.' }, pageAccessToken);
      }
    }
  } else {
    // Si une commande spécifique est utilisée, continuer à l'utiliser
    const command = commands.get(commandName);
    try {
      await command.execute(senderId, args, pageAccessToken, sendMessage);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      sendMessage(senderId, { text: 'Il y a eu une erreur lors de l\'exécution de cette commande.' }, pageAccessToken);
    }
  }
}

module.exports = { handleMessage };
