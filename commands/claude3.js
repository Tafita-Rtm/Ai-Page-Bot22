const axios = require("axios");
const fs = require('fs-extra');
const { getStreamFromURL, shortenURL, randomString } = global.utils;

module.exports = {
    name: "spotify",
    description: "Jouer une chanson à partir de Spotify",
    version: "1.0.0",
    role: 0,
    cooldowns: 10,
    async execute(api, event, args) {
        const { threadID, messageID } = event;
        api.setMessageReaction("🕢", messageID, (err) => {}, true);

        let songName = '';

        const fetchSongFromAttachment = async () => {
            const attachment = event.messageReply.attachments[0];
            if (attachment.type === "audio" || attachment.type === "video") {
                const shortenedUrl = await shortenURL(attachment.url);
                const response = await axios.get(`https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(shortenedUrl)}`);
                return response.data.title;
            } else {
                throw new Error("Type de pièce jointe non valide.");
            }
        };

        try {
            if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
                songName = await fetchSongFromAttachment();
            } else if (args.length === 0) {
                return api.sendMessage("Veuillez fournir un nom de chanson.", threadID, messageID);
            } else {
                songName = args.join(" ");
            }

            const searchResponse = await axios.get(`https://spotify-play-iota.vercel.app/spotify?query=${encodeURIComponent(songName)}`);
            const trackURLs = searchResponse.data.trackURLs;

            if (!trackURLs || trackURLs.length === 0) {
                return api.sendMessage("Aucune piste trouvée pour le nom de chanson fourni.", threadID, messageID);
            }

            const trackID = trackURLs[0];
            const downloadResponse = await axios.get(`https://sp-dl-bice.vercel.app/spotify?id=${encodeURIComponent(trackID)}`);
            const downloadLink = downloadResponse.data.download_link;

            const localFilePath = await downloadTrack(downloadLink);

            await api.sendMessage({
                body: `🎧 Lecture : ${songName}`,
                attachment: fs.createReadStream(localFilePath)
            }, threadID, messageID);

            console.log("Audio envoyé avec succès.");

        } catch (error) {
            console.error("Erreur survenue :", error);
            await api.sendMessage(`Une erreur est survenue : ${error.message}`, threadID, messageID);
        }
    }
};

async function downloadTrack(url) {
    const stream = await getStreamFromURL(url);
    const filePath = `${__dirname}/tmp/${randomString()}.mp3`;
    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);

    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(filePath));
        writeStream.on('error', reject);
    });
}
