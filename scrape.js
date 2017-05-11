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
 * @return {Promise} A Promise that represents the response as a string.
 */
function getHTML(hostname, path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: hostname,
      path: path
    }, (res) => {
      if (res.statusCode == 302) {
        getHTML(hostname, path).then((nestedHTML) => {
          resolve(nestedHTML);
        }).catch((e) => {
          reject(e);
        });
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
    }).on('error', (e) => {
      reject(e);
    });
  });
}

/**
 * Download the Croquis Cafe photo archive.
 * @param {string} requestPath Path component of the URL for an archive page (hostname
 *   component is 'www.onairvideo.com').
 */
function scrapeArchive(requestPath) {
  getHTML('www.onairvideo.com', requestPath).then((archiveHTML) => {
    // array of paths to model pages, filtered by model "name" arguments
    let modelPaths = archiveHTML.match(/cc-photo-archive.{2,}?\.html/g);
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
      nextPagePath = '/' + nextPagePath[1];
    }

    /**
     * Download photos associated with a model.
     * @param {number} modelIndex Index of a model's path from the "modelPaths" array.
     */
    function scrapeModel(modelIndex) {
      getHTML('www.onairvideo.com', '/' + modelPaths[modelIndex]).then((modelHTML) => {
        // array of strings containing photo URLs
        const photoURLs = [];
        const photoRegex = /"src":"\/\/nebula\.wsimg\.com(\/\w{32}\?AccessKeyId=05ECB8D9DFC0F8678544)&disposition=0&alloworigin=1"/g;
        for (let photoRegexObject; (photoRegexObject = photoRegex.exec(modelHTML)) !== null;) {
          photoURLs.push(photoRegexObject[1]);
        }
        const modelName = modelPaths[modelIndex].substring(17, modelPaths[modelIndex].length - 5);

        /**
         * Make an HTTPS request for a photo and save the response as a file.
         * @param {number} photoIndex Index of a photo from the "photoURLs" array.
         */
        function downloadPhoto(photoIndex) {
          // do not overwrite files
          if (fs.existsSync(path.join(archivePath, modelName, photoIndex + 1 + '.jpg'))) {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            console.log(`"${path.join(archivePath, modelName, photoIndex + 1 + '.jpg')}" already exists`);
            console.log('Usage: node scrape.js <directory-path> [<model-name>...]');
            process.exit(1);
          }

          // basic progress indicator
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`Downloading "${modelName}" photo ${photoIndex + 1} of ${photoURLs.length}`);

          https.get({
            hostname: 'nebula.wsimg.com',
            path: photoURLs[photoIndex]
          }, (res) => {
            // write if no server error, do not otherwise (response stream is still switched into flowing mode)
            if (res.statusCode != 500) {
              const photoFile = fs.createWriteStream(path.join(archivePath, modelName, photoIndex + 1 + '.jpg'));
              res.pipe(photoFile);
            } else {
              res.resume();
            }

            res.on('end', () => {
              if (photoIndex + 1 < photoURLs.length) {
                downloadPhoto(photoIndex + 1);
              } else if (modelIndex + 1 < modelPaths.length) {
                scrapeModel(modelIndex + 1);
              } else if (nextPagePath !== null) {
                scrapeArchive(nextPagePath);
              } else {
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);
                console.log('Download complete');
              }
            });
          }).on('error', e => {
            console.log('Error: ' + e.message);
          });
        }

        // use or make subdirectories within the given directory that correspond to the model's pages
        fs.access(path.join(archivePath, modelName), fs.constants.W_OK | fs.constants.X_OK, (err) => {
          if (err !== null) {
            if (err.code == 'EACCES') {
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

          downloadPhoto(0);
        });
      }).catch((e) => {
        console.log('Error: ' + e.message);
      });
    }

    if (modelPaths.length) {
      scrapeModel(0);
    } else if (nextPagePath !== null) {
      scrapeArchive(nextPagePath);
    } else {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log('Download complete');
    }
  }).catch((e) => {
    console.log('Error: ' + e.message);
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
  scrapeArchive('/croquis-cafe-photos1.html');
});
