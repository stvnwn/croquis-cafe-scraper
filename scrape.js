// module dependencies
const fs = require('fs');
const http = require('http');
const path = require('path');
const readline = require('readline');
const https = require('https');

const archivePath = process.argv[2];

/**
 * Make an HTTP request and get the response as a string.
 * @param {object} hostname A domain name or IP address of the server to issue the request to.
 * @param {string} path Request path.
 * @return {Promise} A Promise that represents the completion of the operation. Resolves with the response as a string.
 */
function getHTML(hostname, path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: hostname,
      path: path
    }, (res) => {
      if (res.statusCode == 302) {
        getHTML(hostname, path)
          .then(resolve)
          .catch(reject);
      }
      else {
        let HTML = '';

        res.on('data', (chunk) => {
          HTML += chunk;
        });
        res.on('end', () => {
          resolve(HTML);
        });
      }
    }).on('error', reject);
  });
}

/**
 * Download photos associated with a model.
 * @param {string} modelPath Path to a model's page (assuming that the host is "www.onairvideo.com").
 * @return {Promise} A Promise that represents the completion of the operation.
 */
function scrapeModel(modelPath) {
  return new Promise((resolve, reject) => {
    getHTML('www.onairvideo.com', `/${modelPath}`).then((modelHTML) => {
      /**
       * Make an HTTPS request for a photo and save the response as a file.
       * @param {string} url Path to a photo (assumming that the host is "nebula.wsimg.com").
       * @param {string} name Filename for the photo when it is saved to disk.
       * @return {Promise} A Promise that represents the completion of the operation.
       */
      function downloadPhoto(url, name) {
        return new Promise((resolve, reject) => {
          // FIXME: reject here?
          // do not overwrite files
          if (fs.existsSync(path.join(archivePath, modelName, name))) {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            console.log(`"${path.join(archivePath, modelName, name)}" already exists`);
            console.log('Usage: node scrape.js <directory-path> [<model-name>...]');
            process.exit(1);
          }

          https.get({
            hostname: 'nebula.wsimg.com',
            path: url
          }, (res) => {
            // read response if no server error, do not otherwise (response stream is still switched into flowing mode)
            if (res.statusCode != 500) {
              let photo = Buffer.alloc(0);

              res.on('data', (chunk) => {
                photo = Buffer.concat([photo, chunk], photo.length + chunk.length);
              });

              res.on('end', () => {
                // only write to disk if photo is valid (in this case, if it is large enough)
                if (photo.length > 20) {
                  fs.writeFileSync(path.join(archivePath, modelName, name), photo);
                }
                resolve();
              });
            } else {
              res.resume();
              res.on('end', resolve);
            }
          }).on('error', reject);
        });
      }

      // array of strings containing photo URLs
      const photoURLs = [];
      const photoRegex = /"src":"\/\/nebula\.wsimg\.com(\/\w{32}\?AccessKeyId=05ECB8D9DFC0F8678544)&disposition=0&alloworigin=1"/g;
      for (let photoRegexObject; (photoRegexObject = photoRegex.exec(modelHTML)) !== null;) {
        photoURLs.push(photoRegexObject[1]);
      }
      const modelName = modelPath.substring(17, modelPath.length - 5);

      // use or make subdirectories within the given directory that correspond to the model's pages
      fs.access(path.join(archivePath, modelName), fs.constants.W_OK | fs.constants.X_OK, (err) => {
        if (err !== null) {
          if (err.code == 'EACCES') {
            // FIXME: reject here?
            // can not modify or access subdirectory's contents
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            console.log(`Insufficient permissions for "${path.join(archivePath, modelName)}"`);
            console.log('Usage: node scrape.js <directory-path> [<model-name>...]');
            process.exit(1);
          } else if (err.code == 'ENOENT') {
            // subdirectory does not exist
            fs.mkdirSync(path.join(archivePath, modelName));
          }
        }

        (function downloadModelPhotos(photoIndex) {
          if (photoIndex < photoURLs.length) {
            downloadPhoto(photoURLs[photoIndex], `${photoIndex + 1}.jpg`).then(() => {
              // basic progress indicator
              readline.clearLine(process.stdout, 0);
              readline.cursorTo(process.stdout, 0);
              process.stdout.write(`Downloaded "${modelName}" photo ${photoIndex + 1} of ${photoURLs.length}`);

              downloadModelPhotos(photoIndex + 1);
            }).catch(reject);
          } else {
            resolve();
          }
        }(0));
      });
    }).catch(reject);
  });
}

/**
 * Download the Croquis Cafe photo archive.
 * @param {string} requestPath Path to an archive page (assuming that the host is "www.onairvideo.com").
 * @param {Promise} A Promise that represents the completion of the operation. Resolves with the path to the next archive page.
 */
function scrapeArchivePage(requestPath) {
  return new Promise((resolve, reject) => {
    getHTML('www.onairvideo.com', requestPath).then((archiveHTML) => {
      // array of paths to model pages, filtered by model "name" arguments
      let modelPaths = archiveHTML.match(/cc-photo-archive.{2,}?\.html/g);
      // it is assumed that modelPaths will never be null
      modelPaths = modelPaths.filter((model) => {
        for (let i = 3; i < process.argv.length; i++) {
          if (process.argv[i] == model.substring(17, model.length - 5)) {
            return false;
          }
        }
        return true;
      });

      // since the archive is split into multiple pages, there may be a path to the next page
      let nextPagePath = /href="([\w-.]+)"><span class="button-content wsb-button-content" style="white-space:nowrap">Newer [Pp]hotos<\/span>/.exec(archiveHTML);
      if (nextPagePath !== null) {
        nextPagePath = `/${nextPagePath[1]}`;
      }

      (function scrapeModels(modelIndex) {
        if (modelIndex < modelPaths.length) {
          scrapeModel(modelPaths[modelIndex]).then(() => {
            scrapeModels(modelIndex + 1);
          }).catch(reject);
        } else {
          resolve(nextPagePath);
        }
      }(0));
    }).catch(reject);
  });
}

// check for directory path
if (archivePath === undefined) {
  console.log('Missing directory path');
  console.log('Usage: node scrape.js <directory-path> [<model-name>...]');
  process.exit(1);
}

// check for existing directory and its permissions
fs.access(archivePath, fs.constants.W_OK | fs.constants.X_OK, (err) => {
  if (err !== null) {
    if (err.code == 'EACCES') {
      // can not modify or access directory's contents
      console.log(`Insufficient permissions for "${archivePath}"`);
      console.log('Usage: node scrape.js <directory-path> [<model-name>...]');
      process.exit(1);
    } else if (err.code == 'ENOENT') {
      // directory does not exist
      fs.mkdirSync(archivePath);
    }
  }

  // scrape links to models, then scrape models
  (function scrapeArchive(pagePath) {
    if (pagePath !== null) {
      scrapeArchivePage(pagePath).then((nextPagePath) => {
        scrapeArchive(nextPagePath);
      }).catch(console.log);
    } else {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log('Download complete');
    }
  }('/croquis-cafe-photos1.html'));
});
