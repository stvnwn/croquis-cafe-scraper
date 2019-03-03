// module dependencies
const fs = require('fs');

/**
 * Create a directory. Does not reject if the directory already exists.
 * @param {string} path Directory path.
 * @return {Promise} A Promise that resolves upon the existence of the directory.
 */
function makeDirectory(path) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, { recursive: false }, error => {
      if (error && error.code !== 'EEXIST') {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

module.exports = makeDirectory;
