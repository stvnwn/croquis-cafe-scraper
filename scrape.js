// dependencies
var http = require('http');
var fs = require('fs');
var path = require('path');

var archivePath = process.argv[2];

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

// scrape links to models, then scrape models synchronously
http.get({
  hostname: 'www.onairvideo.com',
  path: '/croquis-cafe-photos.html'
}, function (res) {
  var archiveHTML = '';

  res.on('data', function (data) {
    archiveHTML += data;
  });
  res.on('end', function () {
    // extract links to models from directory
    var models = archiveHTML.match(/cc-photo-archive.{2,}?\.html/g);

    // scrape links to a model's photos, then download photos synchronously
    function scrapeModel(modelIndex) {
      http.get({
        hostname: 'www.onairvideo.com',
        path: '/' + models[modelIndex]
      }, function (res) {
        var modelHTML = '';

        res.on('data', function (data) {
          modelHTML += data;
        });
        res.on('end', function () {
          // extract links to photos from a model's page
          var photos = modelHTML.match(/"src":"\/\/nebula\.wsimg\.com\/\w{32}\?AccessKeyId=05ECB8D9DFC0F8678544&disposition=0&alloworigin=1"/g);
          var modelDir = models[modelIndex].substring(17, models[modelIndex].length - 5);

          // download photo to a model's directory
          // once done, repeat with remaining photos and other models
          function downloadPhoto(photoIndex) {
            http.get({
              hostname: 'nebula.wsimg.com',
              path: photos[photoIndex].substring(25, 91)
            }, function (res) {
              var photo = fs.createWriteStream(path.join(archivePath, modelDir, photoIndex + '.jpg'));
              res.pipe(photo);

              res.on('end', function () {
                if (photoIndex + 1 < photos.length) {
                  downloadPhoto(photoIndex + 1);
                } else if (modelIndex + 1 < models.length) {
                  scrapeModel(modelIndex + 1);
                }
              });
            });
          }

          // make directories within the given directory that correspond to the model's pages
          fs.mkdir(path.join(archivePath, modelDir), function () {
            downloadPhoto(0);
          });
        });
      });
    }

    scrapeModel(0);
  });
});
