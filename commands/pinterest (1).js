const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');
const fs = require('fs');

const token = fs.readFileSync('token.txt', 'utf8');

module.exports = {
  name: 'pinterest',
  description: 'Fetch images from Pinterest',
  author: 'coffee',
  usage: 'pinterest <search term> <number of images (1-10)>',

  async execute(senderId, args) {
    const pageAccessToken = token;

    if (!args || args.length < 1) {
      return await sendMessage(senderId, { text: '📷 | Please use this format:\npinterest cat 1-10' }, pageAccessToken);
    }

    const searchTerm = args[0];
    let numImages = parseInt(args[1]) || 1;
    numImages = Math.abs(numImages);
    numImages = Math.min(numImages, 10);
    numImages = Math.max(numImages, 1);

    const apiUrl = `https://pin-kshitiz.vercel.app/pin?search=${encodeURIComponent(searchTerm)}`;

    try {
      const { data } = await axios.get(apiUrl);
      const images = data.result.slice(0, numImages);

      if (images.length > 0) {
        for (const imageUrl of images) {
          await sendMessage(senderId, { attachment: { type: 'image', payload: { url: imageUrl } } }, pageAccessToken);
        }
      } else {
        await sendMessage(senderId, { text: 'No images found for your search.' }, pageAccessToken);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      await sendMessage(senderId, { text: 'Error: Unable to fetch images from Pinterest.' }, pageAccessToken);
    }
  },
};
