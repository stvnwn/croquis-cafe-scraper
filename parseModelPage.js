// module dependencies
const getHTML = require('./getHTML');

/**
 * Get paths to a model's photos.
 * @param {string} path Path to a model's page (assuming that the host is "www.onairvideo.com").
 * @return {Promise} A Promise that resolves with an array of paths to Croquis Cafe photos.
 */
async function parseModelPage(path) {
  try {
    const modelHTML = await getHTML(path);

    // array of strings containing photo URLs
    const photoPaths = [];
    const regex = /"src":"\/\/nebula\.wsimg\.com(\/.+?\?AccessKeyId=[^&]+).*?"/g;
    let match;
    while ((match = regex.exec(modelHTML))) {
      photoPaths.push(match[1]);
    }

    return photoPaths;
  } catch (error) {
    throw error;
  }
}

module.exports = parseModelPage;
