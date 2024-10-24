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

// Gestion des images avec interaction
async function handleImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    // Envoyer un message pour informer que l'image est en cours d'analyse
    await sendMessage(senderId, { text: '🖼️ J\'analyse l\'image avec GPT-4o... Veuillez patienter ⏳' }, pageAccessToken);

    // Analyser l'image avec GPT-4o
    const extractedText = await analyzeImageWithGpt4o(imageUrl);

    if (!extractedText) {
      await sendMessage(senderId, { text: "Je n'ai pas pu extraire d'information de cette image." }, pageAccessToken);
      return;
    }

    // Sauvegarder le texte extrait dans l'état de l'utilisateur
    userStates.set(senderId, { extractedText });

    // Envoyer le texte extrait directement à GPT-4o
    const gpt4oCommand = commands.get('gpt4o');
    if (gpt4oCommand) {
      await gpt4oCommand.execute(senderId, [extractedText], pageAccessToken, sendMessage); // GPT-4o traite le texte extrait
    }

  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec GPT-4o :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'analyse de l\'image.' }, pageAccessToken);
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

// Remplacement de la fonction d'analyse par GPT-4o
async function analyzeImageWithGpt4o(imageUrl) {
  try {
    // Télécharger l'image depuis l'URL fournie par l'utilisateur
    const imageBuffer = await downloadImage(imageUrl);

    // Envoyer l'image directement à GPT-4o pour analyse
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });

    const response = await axios.post('https://votre-api-gpt4o-endpoint/analyze-image', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Retourner le texte extrait de l'image par GPT-4o
    return response.data.extractedText; // Adaptez selon le format de réponse

  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec GPT-4o :', error);
    throw new Error('Erreur lors de l\'analyse avec GPT-4o.');
  }
}

// Fonction pour télécharger l'image
async function downloadImage(imageUrl) {
  const response = await axios({
    url: imageUrl,
    method: 'GET',
    responseType: 'arraybuffer',
  });
  return Buffer.from(response.data, 'binary');
}

module.exports = { handleMessage };
