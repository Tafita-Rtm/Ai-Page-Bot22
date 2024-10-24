const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('./sendMessage');
const FormData = require('form-data');

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

// Gestion des images avec GPT-4o
async function handleImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    // Envoyer un message pour informer que l'image est en cours d'analyse par GPT-4o
    await sendMessage(senderId, { text: '🖼️ Envoi de l\'image à GPT-4o pour analyse... Veuillez patienter ⏳' }, pageAccessToken);

    // Télécharger l'image depuis l'URL fournie par l'utilisateur
    const imagePath = await downloadImage(imageUrl);

    // Envoyer l'image téléchargée directement à GPT-4o
    const gpt4oResponse = await sendImageToGpt4o(imagePath);

    // Envoyer la réponse de GPT-4o à l'utilisateur
    await sendMessage(senderId, { text: `🤖 Réponse de GPT-4o :\n\n${gpt4oResponse}` }, pageAccessToken);

    // Supprimer le fichier image local après analyse
    fs.unlinkSync(imagePath);

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'image à GPT-4o :', error);
    await sendMessage(senderId, { text: 'Erreur lors de l\'envoi de l\'image à GPT-4o.' }, pageAccessToken);
  }
}

// Fonction pour télécharger l'image localement
async function downloadImage(imageUrl) {
  const imagePath = path.join(__dirname, 'temp_image.jpg'); // Chemin temporaire pour stocker l'image
  const writer = fs.createWriteStream(imagePath);

  const response = await axios({
    url: imageUrl,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(imagePath));
    writer.on('error', reject);
  });
}

// Fonction pour envoyer l'image à GPT-4o
async function sendImageToGpt4o(imagePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath)); // Attacher l'image téléchargée au formulaire

  try {
    const response = await axios.post('https://free-ai-models.vercel.app/v1/chat/completions', form, {
      headers: {
        ...form.getHeaders(),
      }
    });

    // Retourner la réponse générée par GPT-4o
    return response.data.response;

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'image à GPT-4o :', error);
    throw new Error('Erreur lors de l\'analyse de l\'image avec GPT-4o.');
  }
}

// Gestion des textes envoyés
async function handleText(senderId, text, pageAccessToken, sendMessage) {
  const args = text.split(' '); // Diviser le texte en arguments
  const commandName = args.shift().toLowerCase(); // Récupérer le premier mot comme commande

  const command = commands.get(commandName);

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
        await gpt4oCommand.execute(senderId, [text], pageAccessToken, sendMessage); // Envoyer le texte à GPT-4o
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
