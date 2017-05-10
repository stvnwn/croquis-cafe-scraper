# croquis-cafe-scraper

Download the [Croquis Cafe photo archive](http://www.onairvideo.com/photo-archive.html).

## General Instructions

1. Install a recent version of [Node.js](https://nodejs.org/).
2. Access your computer's command-line interface, and change the current working directory to the directory containing this README file.
3. Enter the following into your computer's command-line interface:

   ```
   node scrape.js <directory-path> [<model-name>...]
   ```

   where `<directory-path>` is the path to the directory where you want to download the photo archive, and `[<model-name>...]` are the "names" of models whose photos you do not want to download.

## Notes

After execution, the specified directory will have subdirectories for each model and their photos.

Subdirectories are named after models.

Photos in a subdirectory are numbered from 1 to the total number of photos for the corresponding model.

If the scraper cannot download a photo, the photo's number is skipped.

A model's "name" is derived from the URL of the model's page. For example, "rhus" is derived from "<http://www.onairvideo.com/cc-photo-archive_rhus.html>"

If the specified directory does not exist, then the scraper will create it for you.

If subdirectories that are named after models do not exist, then the scraper will create them for you.

You must have write and execute permissions for the specified directory and its subdirectories that are named after models.

The scraper will not overwrite files.

If you specify a model "name" that was not derived from the URL of a model's page, the scraper will ignore it.

If you have downloaded the entire archive before, you can download any additions to the archive by running this:

```
node scrape.js <directory-path> `ls <directory-path>`
```

where `<directory-path>` refers to the directory where the archive was downloaded to before.
