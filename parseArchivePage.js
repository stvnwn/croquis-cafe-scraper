// module dependencies
const getHTML = require('./getHTML');

/**
 * Get relevant paths from a Croquis Cafe archive page.
 * @param {string} path Path to an archive page (assuming that the host is "www.onairvideo.com").
 * @param {Array} excludedModels Models whose paths should be excluded from being returned.
 * @param {Promise} A Promise that resolves with paths to model pages and the next archive page.
 */
async function parseArchivePage(path, excludedModels = []) {
  try {
    const archiveHTML = await getHTML(path);

    // array of paths to model pages, filtered by model "name" arguments
    const models = [];
    const regex = /cc-photo-archive[_-](.+?)\.html/g;
    let model;
    while ((model = regex.exec(archiveHTML))) {
      if (!excludedModels.includes(model[1])) {
        models.push({
          path: `/${model[0]}`,
          name: model[1]
        });
      }
    }

    // since the archive is split into multiple pages, there may be a path to the next page
    let nextPagePath = /href="([^"]+)"><span.*>Older Photos<\/span>/.exec(
      archiveHTML
    );
    if (nextPagePath !== null) {
      nextPagePath = `/${nextPagePath[1]}`;
    }

    return {
      models: models,
      nextPagePath: nextPagePath
    };
  } catch (error) {
    throw error;
  }
}

module.exports = parseArchivePage;
