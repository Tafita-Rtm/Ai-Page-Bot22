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
    console.log(`Image received: ${imageUrl}`);
    
    // Appel à la commande GPT-4o pour traiter l'image
    const gpt4oCommand = commands.get('gpt4o');  // Assurez-vous que la commande 'gpt4o' est présente dans le dossier commands
    if (gpt4oCommand) {
      try {
        const query = "Décris cette image.";
        // Exécuter GPT-4o pour analyser l'image
        await gpt4oCommand.execute(senderId, [query, imageUrl], pageAccessToken, sendMessage);
      } catch (error) {
        console.error('Erreur lors de l\'analyse de l\'image avec GPT-4o:', error);
        sendMessage(senderId, { text: 'Désolé, je n\'ai pas pu analyser l\'image.' }, pageAccessToken);
      }
    }
  } else if (event.message.text) {
    const messageText = event.message.text.toLowerCase();
    const args = messageText.split(' ');
    const commandName = args.shift();

    if (commands.has(commandName)) {
      const command = commands.get(commandName);
      try {
        await command.execute(senderId, args, pageAccessToken, sendMessage);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
        sendMessage(senderId, { text: 'Il y a eu une erreur lors de l\'exécution de cette commande.' }, pageAccessToken);
      }
    } else {
      // Si aucune commande n'est trouvée, on utilise GPT-4o pour répondre directement
      const gpt4oCommand = commands.get('gpt4o');
      if (gpt4oCommand) {
        try {
          await gpt4oCommand.execute(senderId, [messageText], pageAccessToken, sendMessage);
        } catch (error) {
          console.error('Erreur lors de l\'utilisation de GPT-4o:', error);
          sendMessage(senderId, { text: 'Désolé, il y a eu une erreur avec GPT-4o.' }, pageAccessToken);
        }
      }
    }
  }
}

module.exports = { handleMessage };
