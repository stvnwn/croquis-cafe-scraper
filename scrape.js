// module dependencies
const http = require('http');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

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
          console.log('Error: ' + e.message);
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
 * @param {string} directoryPath Path to directory where the photo archive will be downloaded to.
 * @param {string} requestPath Path component of the URL for an archive page (hostname
 *   component is 'www.onairvideo.com').
 */
function scrapeArchive(directoryPath, requestPath) {
  getHTML('www.onairvideo.com', requestPath).then((archiveHTML) => {
    // array of paths to model pages
    const models = archiveHTML.match(/cc-photo-archive.{2,}?\.html/g);

    // since the archive is split into multiple pages, there may be a path to the next page
    let nextPagePath = archiveHTML.match(/href="croquis-cafe-photo[\w-]+\.html"><span class="button-content wsb-button-content" style="white-space:nowrap">Newer [Pp]hotos<\/span>/);
    if (nextPagePath != null) {
      nextPagePath = '/' + nextPagePath[0].match(/croquis-cafe-photo.+\.html/)[0];
    }

    /**
     * Download photos associated with a model.
     * @param {number} modelIndex Index of a model from the "models" array.
     */
    function scrapeModel(modelIndex) {
      getHTML('www.onairvideo.com', '/' + models[modelIndex]).then((modelHTML) => {
        // array of strings containing photo URLs
        const photos = modelHTML.match(/"src":"\/\/nebula\.wsimg\.com\/\w{32}\?AccessKeyId=05ECB8D9DFC0F8678544&disposition=0&alloworigin=1"/g);
        const modelName = models[modelIndex].substring(17, models[modelIndex].length - 5);

        /**
         * Make an HTTP request for a photo and save the response as a file.
         * @param {number} photoIndex Index of a photo from the "photos" array.
         */
        function downloadPhoto(photoIndex) {
          // basic progress indicator
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`Downloading "${modelName}" photo ${photoIndex} of ${photos.length}`);

          http.get({
            hostname: 'nebula.wsimg.com',
            path: photos[photoIndex].substring(25, 91)
          }, (res) => {
            const photo = fs.createWriteStream(path.join(directoryPath, modelName, photoIndex + '.jpg'));
            res.pipe(photo);

            res.on('end', () => {
              if (res.statusCode == 500) {
                photos.splice(photoIndex, 1);
                photoIndex--;
              }

              if (photoIndex + 1 < photos.length) {
                downloadPhoto(photoIndex + 1);
              } else if (modelIndex + 1 < models.length) {
                scrapeModel(modelIndex + 1);
              } else if (nextPagePath != null) {
                scrapeArchive(directoryPath, nextPagePath);
              } else {
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);
                console.log('Downloaded all found photos from the archive');
              }
            });
          }).on('error', e => {
            console.log('Error: ' + e.message);
          });
        }

        // make directories within the given directory that correspond to the model's pages
        fs.mkdir(path.join(directoryPath, modelName), () => {
          downloadPhoto(0);
        });
      }).catch((e) => {
        console.log('Error: ' + e.message);
      });
    }

    scrapeModel(0);
  }).catch((e) => {
    console.log('Error: ' + e.message);
  });
}

// check for command-line argument
if (archivePath === undefined) {
  console.log('Missing path to directory');
  console.log('Usage: node scrape.js <pathToDirectory>');
  process.exit(1);
}

// check if directory exists
if (fs.existsSync(archivePath)) {
  console.log('Directory already exists');
  console.log('Usage: node scrape.js <pathToDirectory>');
  process.exit(1);
}

// make directory
fs.mkdirSync(archivePath);

// scrape links to models, then scrape models
scrapeArchive(archivePath, '/croquis-cafe-photos1.html');
