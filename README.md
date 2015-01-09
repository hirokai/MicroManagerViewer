# Multidimensional image viewer for MicroManager (MdV)

[![Dependency Status](https://david-dm.org/hirokai/MicroManagerViewer.svg)](https://david-dm.org/hirokai/MicroManagerViewer)
[![devDependency Status](https://david-dm.org/hirokai/MicroManagerViewer/dev-status.svg)](https://david-dm.org/hirokai/MicroManagerViewer#info=devDependencies)

> A prototype web app for viewing multidimensional images from  [MicroManager](https://www.micro-manager.org/) microscopy software.

## Getting Started

1. Use a Python script (`backend/gen_csv.py`) to generate thumbnails and metadata.
  1. Edit `datasets` variable in `backend/gen_csv.py` to define data sets.
  1. Run `backend/gen_csv.py`, and it will generate:
    1. Data set entries in `datasets.csv` file.
    1. Metadata of each data set in `metadata` folder.
    1. images in `images` folder.

1. The web interface, written with [React](http://facebook.github.io/react/), uses static JSON files and image thumbnails.

The server side just needs to serve static files. For example, run the following in the folder of index.html.

```shell
python -m SimpleHTTPServer 3000
```

Then just open [http://localhost:3000/](http://localhost:3000/) in a web browser.


## License
MIT license.

