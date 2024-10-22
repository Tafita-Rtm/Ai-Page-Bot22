const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'texttospeech',
  description: 'Convertit un texte en fichier audio et l\'envoie à l\'utilisateur.',
  
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const header = "🔊 Text-to-Speech Service\n───────────────";
    const footer = "───────────────";

    // Extraire le texte à convertir
    const text = args.join(' ');

    if (!text) {
      return sendMessage(senderId, { text: `${header}\nVeuillez fournir un texte à convertir en voix.\n${footer}` }, pageAccessToken);
    }

    try {
      // Envoyer un message indiquant que la conversion est en cours
      await sendMessage(senderId, { text: `🎙️ *Conversion du texte en voix...* ⏳` }, pageAccessToken);

      // Utiliser Eleven Labs pour convertir le texte en fichier audio
      const audioFilePath = await convertTextToSpeechElevenLabs(text);

      // Envoyer le fichier audio en flux à l'utilisateur
      await sendAudioAsStream(audioFilePath, senderId, sendMessage, pageAccessToken);

    } catch (error) {
      console.error("Erreur lors de la conversion texte-en-parole:", error.message);
      await sendMessage(senderId, { text: `${header}\nUne erreur est survenue: ${error.message}\n${footer}` }, pageAccessToken);
    }
  }
};

// Fonction pour convertir le texte en voix avec Eleven Labs
async function convertTextToSpeechElevenLabs(text) {
  const apiKey = 'sk_04fee5b196ffb08fa8d93e95de08a100b89794bc8efbc807'; // Clé API Eleven Labs
  const voiceId = '21m00Tcm4TlvDq8ikWAM'; // ID de la voix souhaitée

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    // Générer un nom de fichier unique pour l'audio
    const audioFileName = `output_${Date.now()}.mp3`;
    const audioFilePath = path.join(__dirname, `../audio/${audioFileName}`);

    // Sauvegarder le fichier audio
    fs.writeFileSync(audioFilePath, response.data);

    return audioFilePath; // Retourner le chemin du fichier audio
  } catch (error) {
    console.error('Erreur lors de la conversion texte-en-parole avec Eleven Labs:', error.message);
    throw new Error('Erreur avec Eleven Labs TTS.');
  }
}

// Fonction pour envoyer le fichier audio en flux
async function sendAudioAsStream(audioFilePath, senderId, sendMessage, pageAccessToken) {
  try {
    const audioData = fs.readFileSync(audioFilePath); // Lire les données binaires du fichier audio

    // Envoyer le fichier en flux directement
    await sendMessage(senderId, {
      attachment: {
        type: 'audio',
        payload: {
          url: audioFilePath, // Utiliser le fichier local ou une URL générée pour envoyer l'audio
          is_reusable: true
        }
      }
    }, pageAccessToken);

    // Supprimer le fichier audio après l'envoi (optionnel)
    fs.unlinkSync(audioFilePath);
  } catch (error) {
    console.error("Erreur lors de l'envoi du fichier audio:", error.message);
    throw new Error("Erreur lors de l'envoi du fichier audio.");
  }
}

