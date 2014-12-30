import os
import logging
import json

def readMetadataFolderForImgConvert(folder, pos_subfolder):
	logging.debug('readMetadataFolder(): %s, %s' % (folder, pos_subfolder))
	path = os.path.join(folder, pos_subfolder, 'metadata.txt')
	if not os.path.exists(path):
		logging.info('readMetadataFolder(): metadata.txt not found: %s' % (path))
		return None
	import sys

	sys.stdout.write('.')
	# Read coord from metadata.txt
	with open(path) as f:
		try:
			obj = json.load(f)
			fr_keys = obj.keys()
			set_uuid = obj['Summary']['UUID']
			for fr in fr_keys:
				if fr == 'Summary':
					continue
				chname = obj[fr]['Channel']
				objf = obj[fr]
				frame = objf['FrameIndex']
				slice = objf['SliceIndex']
				uuid = objf.get('UUID') or (set_uuid+'_'+fr)
				imgpath = os.path.join(folder, pos_subfolder, 'img_%09d_%s_%03d.tif' % (frame, chname, slice))
				convert_multiple(set_uuid, uuid, imgpath, quality=['s1'])
		except Exception as e:
			logging.error(e)

def convert(imgpath,outpath,method='scipy', size=0.25):
	if method == 'ImageMagick':
		import subprocess
		subprocess.call(['convert', '-quiet', '-contrast-stretch', '0.15x0.02%', '-resize', '%d%%' % (size*100), imgpath, outpath])
	elif method == 'scipy':
		import tifffile
		import scipy.misc,scipy.ndimage
		img = tifffile.imread(imgpath)
		img2 = scipy.ndimage.zoom(img,size)
		scipy.misc.imsave(outpath, img2)


def convert_multiple(set_uuid, img_uuid, imgpath, quality = ['half', 's1'], overwrite=False):
	outfolder = os.path.join('..', 'images', set_uuid)
	if not os.path.exists(outfolder):
		os.makedirs(outfolder)
	outpath_base = os.path.join(outfolder,img_uuid)
	outpath = outpath_base + '.png'
	if 'half' in quality and (overwrite or not os.path.exists(outpath)):
		convert(imgpath,outpath,method='scipy',size=0.5)
	outpath = outpath_base + '_s1.jpg'
	if 's1' in quality and (overwrite or not os.path.exists(outpath)):
		convert(imgpath,outpath,method='scipy',size=0.125)

import os, fnmatch

# http://stackoverflow.com/questions/6987123/search-in-wildcard-folders-recursively-in-python

def locate(pattern, root_path):
    for path, dirs, files in os.walk(os.path.abspath(root_path)):
        for filename in fnmatch.filter(files, pattern):
            yield os.path.join(path, filename)


def batch_convert():
	import test_config
	import multiprocessing
	from joblib import Parallel, delayed

#	logging.basicConfig(level=logging.DEBUG)
	fs = []
	for f in locate('metadata.txt',test_config.batch_root):
		subfolder = f.replace('metadata.txt','')
		folder = os.path.join(subfolder,'..')
		fs.append((folder,subfolder))
	print('%d metadata files.' % (len(f)))
	num_cores = multiprocessing.cpu_count()
	Parallel(n_jobs=num_cores)(delayed(readMetadataFolderForImgConvert)(folder, subfolder) for folder,subfolder
                                  in fs)

if __name__ == "__main__":
	batch_convert()