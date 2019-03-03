// module dependencies
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const parseArchivePage = require('./parseArchivePage');
const parseModelPage = require('./parseModelPage');
const makeDirectory = require('./makeDirectory');
const downloadPhoto = require('./downloadPhoto');

const resetLine = function resetTtyLine() {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
};
const archivePath = process.argv[2];

// check for directory path
if (archivePath === undefined) {
  console.log('Missing directory path.');
  console.log('Usage: node scrape.js <directory-path> [<model-name>...]');
  process.exit(1);
}

try {
  fs.mkdirSync(archivePath);
} catch (error) {
  if (error.code !== 'EEXIST') {
    console.log('Directory for poses does not exist; could not create one.');
    console.log('Usage: node scrape.js <directory-path> [<model-name>...]');
    process.exit(1);
  }
}

// scrape links to models, then scrape models
(async function scrapeArchive(pagePath) {
  if (pagePath !== null) {
    try {
      const content = await parseArchivePage(pagePath, process.argv.slice(3));
      for (model of content.models) {
        let photoPaths;
        photoPaths = (await Promise.all([
          makeDirectory(path.join(archivePath, model.name)),
          parseModelPage(model.path)
        ]))[1];
        for (let i = 0; i < photoPaths.length; i++) {
          resetLine();
          process.stdout.write(
            `Downloading photo to ${path.join(
              archivePath,
              model.name,
              `${i}.jpg`
            )}`
          );
          try {
            await downloadPhoto(
              photoPaths[i],
              path.join(archivePath, model.name),
              `${i}.jpg`
            );
          } catch (error) {
            resetLine();
            console.log(
              `Failed to download photo to ${path.join(
                archivePath,
                model.name,
                `${i}.jpg`
              )}`
            );
          }
        }
      }
      scrapeArchive(content.nextPagePath);
    } catch (error) {
      resetLine();
      console.log(error);
    }
  } else {
    resetLine();
  }
})('/photo-archive.html');
