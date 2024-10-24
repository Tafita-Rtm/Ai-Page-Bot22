const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');
const fs = require('fs');

const token = fs.readFileSync('token.txt', 'utf8');

module.exports = {
  name: 'shoti',
  description: 'Fetch a TikTok video and send only the video',
  usage: 'Shoti',
  author: 'Aljur',

  execute: async (senderId) => {
    const pageAccessToken = token;
    const predefinedUrl = 'https://vt.tiktok.com/ZSYwJSnwn/';
    const apiUrl = `https://shoti.kenliejugarap.com/getvideo.php?apikey=shoti-3673ed33bc8186f@b37aba4c425fa@36@e6f30c0863dae181779bad3ee08@6ae95834eb@c8d1ccdf1d21a@b5@b4dc41afe7d@b8063f202@19c1c3fbf7bf1cbb@b1cac4b2d71fabc6c1b760ac0769490baaf4e6@c50&url=${encodeURIComponent(predefinedUrl)}`;

    try {
      const { data } = await axios.get(apiUrl);

      if (data.status && data.videoDownloadLink) {
        const videoMessage = {
          attachment: {
            type: 'video',
            payload: { url: data.videoDownloadLink }
          }
        };

        sendMessage(senderId, videoMessage, pageAccessToken);
      } else {
        sendError(senderId, 'Error: Unable to fetch video.', pageAccessToken);
      }
    } catch (error) {
      console.error('Error fetching video:', error);
      sendError(senderId, 'Error: Unexpected error occurred.', pageAccessToken);
    }
  },
};

const sendError = async (senderId, errorMessage, pageAccessToken) => {
  await sendMessage(senderId, { text: errorMessage }, pageAccessToken);
};
