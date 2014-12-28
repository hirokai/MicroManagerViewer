import json
import os
from joblib import Parallel, delayed
import multiprocessing
import logging

gdrive = '/Volumes/Macintosh HD/Google Drive/Groves/Scope 7/'

datasets = [
	# gdrive + '20141219 T cells on pattern LAT-EGFP unsorted/02 FC2/cells_1',
	# gdrive + '20141219 T cells on pattern LAT-EGFP unsorted/04 FC3/cells_ricm_1',
	# gdrive + '20141219 T cells on pattern LAT-EGFP unsorted/05 FC4/cells_ricm_1',
	{'name': '20141130 Immunostaining/03 FC1 TIRF',
	 'folders': [gdrive + '20141130 Immunostaining/03 FC1/01 tirf and confocal/tirf_5ch_1'
, gdrive + '20141130 Immunostaining/03 FC1/01 tirf and confocal/tirf_5ch_2'
, gdrive + '20141130 Immunostaining/03 FC1/01 tirf and confocal/tirf_5ch_3'
, gdrive + '20141130 Immunostaining/03 FC1/01 tirf and confocal/tirf_5ch_4'
, gdrive + '20141130 Immunostaining/03 FC1/01 tirf and confocal/tirf_5ch_5']},
	{'name': '20141130 Immunostaining/02 FC3 TIRF',
	 'folders': [gdrive + '20141130 Immunostaining/02 FC3/tirf_1'
		, gdrive + '20141130 Immunostaining/02 FC3/tirf_2'
		, gdrive + '20141130 Immunostaining/02 FC3/tirf_5ch_1']},
	{'name': '20141130 Immunostaining/01 FC4 TIRF',
	 'folders': [gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_1'
		, gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_2'
		, gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_3'
		, gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_4'
		, gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_5'
		, gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_6'
		, gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_7'
		, gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_8'
		, gdrive + '20141130 Immunostaining/01 FC4/tirf_5ch_9']},
	# gdrive + '20141225 T cells on new PLL-PEG pattern/03 FC3/02 cells_3/'
	# , gdrive + '20141225 T cells on new PLL-PEG pattern/04 FC4/02 cells 561nm_4/'
]

logging.basicConfig(level=logging.WARNING)

force_imgout = True

def is_number(s):
	try:
		float(s)
		return True
	except ValueError:
		return False


def convert(imgpath,outpath,method='ImageMagick'):
	if method == 'ImageMagick':
		import subprocess
		subprocess.call(['convert', '-quiet', '-contrast-stretch', '0.15x0.02%', '-geometry', '256x256', imgpath, outpath])
	elif method == 'scipy':
		import tifffile
		import scipy.misc
		img = tifffile.imread(imgpath)
		scipy.misc.imsave(outpath, img)



def readMetadataFolder(folder, pos_subfolder, metaset=False):
	logging.debug('readMetadataFolder(): %s, %s' % (folder, pos_subfolder))
	path = os.path.join(folder, pos_subfolder, 'metadata.txt')
	if not os.path.exists(path):
		logging.info('readMetadataFolder(): metadata.txt not found: %s' % (path))
		return None
	import sys

	sys.stdout.write('.')
	# Read coord from metadata.txt
	res = []
	with open(path) as f:
		obj = json.load(f)
		fr_keys = obj.keys()
		set_uuid = obj['Summary']['UUID']
		outfolder = os.path.join('..', 'images', set_uuid)
		if not os.path.exists(outfolder):
			os.makedirs(outfolder)
		for fr in fr_keys:
			if fr == 'Summary':
				continue
			ch = obj[fr]['Channel']
			objf = obj[fr]
			idx = objf['FrameIndex']
			uuid = objf['UUID']
			imgpath = os.path.join(folder, pos_subfolder, 'img_%09d_%s_000.tif' % (idx, ch))
			outpath = '%s/%s.jpg' % (outfolder, uuid)
			if force_imgout or not os.path.exists(outpath):
				convert(imgpath,outpath,method='scipy')
			row = (uuid
			       , idx
			       , objf['PositionIndex']
			       , objf['ChannelIndex']
			       , objf['ElapsedTime-ms']
			       , objf['PositionName']
			       , objf['XPositionUm']
			       , objf['YPositionUm']
			       , ch)
			if metaset:
				row = (folder,set_uuid) + row
			res.append(row)
	return res, set_uuid


def updateDatasets():
	import csv

	csvpath = '../datasets.csv'
	with open(csvpath, 'wb') as f:
		writer = csv.writer(f)
		writer.writerow(['uuid', 'name', 'folder', 'metaset', 'images'])
		for d in sorted(datasets_processed,key=lambda a: a[1]):     # Sorted by name
			writer.writerow(d)


datasets_processed = []


def write_to_csv(poss, set_uuid, metaset=False):
	import csv

	csvpath = os.path.join('..', 'metadata', set_uuid + '.csv')
	header = ['folder','set_uuid', 'uuid', 'frame', 'posidx', 'chidx', 'time', 'posname', 'x', 'y', 'chname'] if metaset else \
		['uuid', 'frame', 'posidx', 'chidx', 'time', 'posname', 'x', 'y', 'chname']
	with open(csvpath, 'wb') as f:
		writer = csv.writer(f)
		writer.writerow(header)
		for pos in poss:
			writer.writerow(pos)


def process_set(dataset):
	print('Processing: ' + dataset)
	num_cores = multiprocessing.cpu_count()
	poss = Parallel(n_jobs=num_cores)(delayed(readMetadataFolder)(dataset, subfolder) for subfolder
	                                  in os.listdir(dataset) if os.path.isdir(os.path.join(dataset, subfolder)))
	poss = [x for x in poss if x is not None]
	set_uuid = poss[0][1]

	# Sort by time or position
	sort_by_time = True
	key = 4 if sort_by_time else 2
	pos_flatten = sorted(reduce(lambda c, d: c + d, map(lambda b: b[0], filter(lambda a: a is not None, poss))),
	                     key=lambda e: e[key])

	write_to_csv(pos_flatten, set_uuid)

	import re

	m = re.search('/(\d{6,8}.+?/.+?)/', dataset)
	name = m.group(1)
	datasets_processed.append((set_uuid, name, dataset, 0, len(pos_flatten)))

	print('\nProcessed: ' + set_uuid)


def mk_name_of_metaset(ds):
	import re

	m = re.search('/(\d{6,8}.+?/.+?)/', ds[0])
	name = m.group(1)
	return name


def process_metaset(ds):
	print('Processing: ' + ds['name'])
	num_cores = multiprocessing.cpu_count()

	pos_all = []
	set_uuid = []
	for dataset in ds['folders']:
		poss = Parallel(n_jobs=num_cores)(delayed(readMetadataFolder)(dataset, subfolder, metaset=True) for subfolder
		                                  in os.listdir(dataset) if os.path.isdir(os.path.join(dataset, subfolder)))
		pos_all += [x for x in poss if x is not None]
		if len(pos_all) > 0:
			set_uuid.append(pos_all[0][1])

	# Sort by time or position
	sort_by_time = True
	key = 6 if sort_by_time else 4
	pos_flatten = sorted(reduce(lambda c, d: c + d, map(lambda b: b[0], filter(lambda a: a is not None, pos_all))),
	                     key=lambda e: e[key])

	import hashlib

	id = hashlib.sha256(','.join(sorted(set_uuid))).hexdigest()
	write_to_csv(pos_flatten, 'metaset_%s' % (id), metaset=True)

	datasets_processed.append(('metaset_' + id, ds['name'], id,1,len(pos_flatten)))

	print('\nProcessed: ' + id)


def main():
	import time
	initial = time.time()
	for d in datasets:
		if isinstance(d, dict):
			process_metaset(d)
		else:
			process_set(d)
	updateDatasets()
	final = time.time()
	print('Done. %d images processed. %.1f sec total.' % (sum([d[4] for d in datasets_processed]),final-initial))

main()
