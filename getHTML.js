// module dependencies
const http = require('http');

/**
 * Make an HTTP request for a page from www.onairvideo.com and get the response as a string.
 * @param {string} path Request path.
 * @return {Promise} A Promise that resolves with the response as a string.
 */
function getHTML(path) {
  return new Promise((resolve, reject) => {
    http
      .get(
        {
          hostname: 'www.onairvideo.com',
          path: path
        },
        res => {
          if (res.statusCode == 302) {
            getHTML(path)
              .then(resolve)
              .catch(reject);
          } else {
            let HTML = '';

            res.on('data', chunk => {
              HTML += chunk;
            });
            res.on('end', () => {
              resolve(HTML);
            });
          }
        }
      )
      .on('error', reject);
  });
}

module.exports = getHTML;
