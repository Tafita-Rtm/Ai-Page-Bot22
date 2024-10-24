const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('./sendMessage');

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

// Fonction pour gérer les images et les analyser avec Gemini
async function handleImage(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    // Envoyer un message à l'utilisateur pour confirmer la réception de l'image
    await sendMessage(senderId, { text: '🖼️ Merci pour l\'image ! Que voulez-vous que je fasse avec cette image ? (analyse, détection d\'erreur, etc.)' }, pageAccessToken);

    // Enregistrer l'URL de l'image et activer le mode de discussion d'image
    userStates.set(senderId, { mode: 'image_discussion', imageUrl });
  } catch (error) {
    console.error('Erreur lors de la gestion de l\'image :', error);
    await sendMessage(senderId, { text: '😔 Erreur lors de la gestion de l\'image.' }, pageAccessToken);
  }
}

// Gestion des textes envoyés
async function handleText(senderId, text, pageAccessToken, sendMessage) {
  const userState = userStates.get(senderId);

  if (userState && userState.mode === 'image_discussion') {
    if (text.toLowerCase() === 'stop') {
      // L'utilisateur veut arrêter la discussion sur l'image
      userStates.delete(senderId);
      await sendMessage(senderId, { text: '🚫 Discussion sur l\'image terminée. Je suis prêt pour autre chose !' }, pageAccessToken);
    } else {
      // Continuer l'interaction sur l'image
      await handleImageDiscussion(senderId, userState.imageUrl, text, pageAccessToken, sendMessage);
    }
  } else {
    // Si aucune image n'est en cours de discussion, gérer normalement
    await sendMessage(senderId, { text: "Je ne suis pas sûr de comprendre 🤔. Envoyez-moi une image et je peux l'analyser pour vous !" }, pageAccessToken);
  }
}

// Fonction pour interagir sur l'image avec Gemini
async function handleImageDiscussion(senderId, imageUrl, userQuery, pageAccessToken, sendMessage) {
  try {
    // Envoyer un message pour informer que Gemini va traiter la question
    await sendMessage(senderId, { text: '🔍 Je traite votre demande... Veuillez patienter ⏳' }, pageAccessToken);

    // Envoyer l'image et la question à Gemini pour analyse
    const response = await analyzeImageWithGemini(imageUrl, userQuery);

    if (!response) {
      await sendMessage(senderId, { text: "😕 Je n'ai pas pu obtenir une réponse satisfaisante à propos de cette image." }, pageAccessToken);
      return;
    }

    // Répondre avec la réponse de Gemini et ajouter des émojis
    await sendMessage(senderId, { text: `🤖 Voici ce que j'ai trouvé :\n${response}` }, pageAccessToken);

  } catch (error) {
    console.error('Erreur lors de l\'analyse avec Gemini :', error);
    await sendMessage(senderId, { text: '😔 Désolé, une erreur est survenue lors de l\'analyse de l\'image.' }, pageAccessToken);
  }
}

// Fonction pour analyser une image avec Gemini en fonction de la demande de l'utilisateur
async function analyzeImageWithGemini(imageUrl, userQuery) {
  const geminiApiEndpoint = 'https://sandipbaruwal.onrender.com/gemini2'; // L'URL de l'API Gemini

  try {
    // Ajouter la requête utilisateur au message envoyé à Gemini
    const response = await axios.get(`${geminiApiEndpoint}?url=${encodeURIComponent(imageUrl)}&query=${encodeURIComponent(userQuery)}`);
    
    if (response.data && response.data.answer) {
      return response.data.answer;
    }

    return '';
  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'image avec Gemini :', error);
    throw new Error('Erreur lors de l\'analyse avec Gemini');
  }
}

module.exports = { handleMessage };
