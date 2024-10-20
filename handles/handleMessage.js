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

    // Appel à la commande Gemini pour traiter l'image
    const geminiCommand = commands.get('gemini');  // Assurez-vous que la commande 'gemini' est présente dans le dossier commands
    if (geminiCommand) {
      try {
        // Envoyer un message demandant ce que l'utilisateur veut faire avec l'image
        await sendMessage(senderId, { text: 'Que voulez-vous que je fasse avec cette image ?' }, pageAccessToken);

        // Attendre la réponse de l'utilisateur
        const query = await waitForUserResponse(senderId); // Fonction simulée pour attendre la réponse de l'utilisateur

        // Exécuter Gemini pour analyser l'image avec la réponse de l'utilisateur
        await geminiCommand.execute(senderId, [query, imageUrl], pageAccessToken, sendMessage);
      } catch (error) {
        console.error('Erreur lors de l\'analyse de l\'image avec Gemini:', error);
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

// Fonction simulée pour attendre la réponse de l'utilisateur
async function waitForUserResponse(senderId) {
  // Cette fonction doit être implémentée pour écouter la réponse de l'utilisateur après la demande
  // Cela pourrait impliquer de stocker l'état de la conversation, d'attendre un nouveau message de l'utilisateur, etc.
  // Ici, elle est simplement simulée avec un retour direct pour l'exemple
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('Je veux que tu répondes aux questions dans l\'image');
    }, 3000); // Simule une attente de 3 secondes
  });
}

module.exports = { handleMessage };
