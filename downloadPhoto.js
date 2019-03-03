// module dependencies
const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Make an HTTPS request for a Croquis Cafe photo and save the response as a file.
 * @param {string} urlPath Path to a photo (assumming that the host is "nebula.wsimg.com").
 * @param {string} name Filename for the photo when it is written to disk.
 * @return {Promise} A Promise that resolves when the photo is successfully written to disk.
 */
function downloadPhoto(urlPath, directory, name) {
  return new Promise((resolve, reject) => {
    // do not overwrite files
    /*
    if (fs.existsSync(path.join(archivePath, modelName, name))) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(
        `"${path.join(archivePath, modelName, name)}" already exists`
      );
      console.log('Usage: node scrape.js <directory-path> [<model-name>...]');
      process.exit(1);
    }
    */

    https
      .get(
        {
          hostname: 'nebula.wsimg.com',
          path: urlPath
        },
        res => {
          // read response if no server error, do not otherwise (response stream is still switched into flowing mode)
          if (res.statusCode != 500) {
            let photo = Buffer.alloc(0);

            res.on('data', chunk => {
              photo = Buffer.concat(
                [photo, chunk],
                photo.length + chunk.length
              );
            });

            res.on('end', () => {
              // only write to disk if photo is valid (in this case, if it is large enough)
              if (photo.length > 20) {
                try {
                  fs.writeFileSync(path.join(directory, name), photo);
                  resolve();
                } catch (error) {
                  // TODO: name new Error depending on the type of error (see write(2))
                  reject(error);
                }
              } else {
                reject(new Error('Photo is zero bytes.'));
              }
            });
          } else {
            res.resume();
            reject(new Error(res.statusMessage));
          }
        }
      )
      .on('error', reject);
  });
}

module.exports = downloadPhoto;
