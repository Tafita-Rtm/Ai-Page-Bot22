const axios = require('axios');

module.exports = {
  name: 'gpt4o',
  description: 'Generate text using GPT-4o API',
  author: 'Carl John Villavito',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');

    if (prompt === "") {
      sendMessage(senderId, { text: "Usage: /gpt4o <question>" }, pageAccessToken);
      return; // Ensure the function doesn't continue
    }

    // Inform the user that content is being generated
    sendMessage(senderId, { text: 'Generating content... Please wait.' }, pageAccessToken);

    try {
      const apiUrl = `https://deku-rest-apis.ooguy.com/api/gpt-4o?q=${encodeURIComponent(prompt)}&uid=${senderId}`;
      const response = await axios.get(apiUrl);

      // Extract the result from the response
      const result = response.data.result;

      // Send the generated text to the user with proper concatenation
      sendMessage(senderId, { text: "GPT4o BY CHATGPT:\n\n" + result }, pageAccessToken);

    } catch (error) {
      console.error('Error calling GPT-4o API:', error);
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};
